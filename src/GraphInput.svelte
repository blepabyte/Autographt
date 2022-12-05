<script lang="ts">
    export let InGraph = null;
    export let InTerpolate = null;

    let demo_input = `
[[1, 2], [2, 3], [3, 1]]
{{1, 2}, {2, 3}, {3, 1}}

0.5 0.5 1
-0.5 0.5 1
0 -0.5 1
    `;

    import { Matrix } from "ml-matrix";
    import { to_zero_index_edges, to_zero_index_vertices } from "./math/Graphs";

    let graph_ok = true;
    let aut_ok = true;

    // Elements
    let stderr_div;
    let textarea_inputs = {
        graph: "",
        matrix: "",
        permutation: ""
    };

    let InputState = {
        G: null,
        M: null,
        P: null,
        S: "linear",
    };

    function validate_and_push_state() {
        console.info("Trying to validate given graph inputs...");
        // If the permutation is null, then animation will just be disabled
        if (InputState.G === null || InputState.M === null)
            return "Both graph and embedding must be specified";

        let n = InputState.M.rows;
        let vertices = InputState.G.flatMap((x) => x);
        let n_ = new Set(vertices).size;
        if (n !== n_)
            return `Input disagrees in number of vertices: ${n} \\neq ${n_}`;

        // Convert 1-indexed to 0-indexed
        InGraph = {
            nv: n,
            edges: to_zero_index_edges(InputState.G),
            positions: InputState.M,
        };

        // TODO: Maybe further validation of the permutation?

        if (InputState.P === null || InputState.P.length !== n) {
            InTerpolate = {
                spec: "noop",
            };
            return "Ok. Animation disabled because no valid permutation was provided";
        } else {
            InTerpolate = {
                spec: InputState.S,
                permutation: to_zero_index_vertices(InputState.P),
                n,
            };
        }

        return "Ok!";
    }

    const RE_SEPARATOR = /\s+/;

    function handler_for_textarea(h) {
        return (e: Event) => {
            let to_parse: string = (<HTMLTextAreaElement>e.target).value.trim();
            let response = h(to_parse);
            // Really missing proper sum types. Not worth pulling in a dependency for it.
            if (typeof response === "string") {
                // Output error message
                stderr_div.innerText = response;
            } else {
                stderr_div.innerText = validate_and_push_state();
            }
        };
    }

    let input_select = () => {
        stderr_div.innerText = validate_and_push_state();
    };

    let parse_graph = ((text: string) => {
        let text_as_edge_pairs = text.replaceAll("{", "[").replaceAll("}", "]");
        let E;
        try {
            E = JSON.parse(text_as_edge_pairs);
        } catch {
            return "Syntax error in specification of graph edges";
        }
        InputState.G = E;
    });

    let parse_matrix = ((text: string) => {
        let A: Array<Array<number>>;
        if (text.startsWith("[")) {
            try {
                A = JSON.parse(text);
            } catch {
                return "Tried to parse matrix as JSON but encountered a syntax error";
            }
        } else {
            A = text
                .split("\n")
                .map((r) => r.split(RE_SEPARATOR).map(x => parseFloat(x)));
        }
        let M: Matrix;
        try {
            M = new Matrix(A);
            if (!isFinite(M.sum())) {
                throw new Error();
            }
        } catch {
            return "Could not recognise matrix format";
        }
        if (M.columns !== 3)
            return `The embedding matrix must have 3 columns: Got ${M.columns}`;
        InputState.M = M;
    });

    let parse_permutation = ((text: string) => {
        if (text.length === 0) return;

        let A: Array<number>;
        if (text.startsWith("[")) {
            try {
                A = JSON.parse(text);
            } catch {
                return "Syntax error in specification of automorphism";
            }
        } else {
            A = text.split(RE_SEPARATOR).map(x => parseInt(x))
        }
        if (A.length === 0 || A.includes(NaN)) {
            return "Syntax error in specification of automorphism";
        }
        console.log(A);

        InputState.P = A;
    });

    interface LoadRemote {
        graph: Array<[number, number]>
        matrix: Array<Array<number>>
        permutation: Array<number>
    }

    // TODO: Eventually make part of UI
    async function from_url(url: string) {
        let {graph, matrix, permutation}: LoadRemote = await (await fetch(url)).json()
        let graph_str = JSON.stringify(graph)
        let matrix_str = JSON.stringify(matrix)
        let perm_str = JSON.stringify(permutation)

        textarea_inputs.graph = graph_str
        textarea_inputs.matrix = matrix_str
        textarea_inputs.permutation = perm_str

        parse_graph(graph_str)
        parse_matrix(matrix_str)
        parse_permutation(perm_str)
    }
    window.load_from_url = from_url // For console use
</script>

<div>
    Interpolation method:
    <select bind:value={InputState.S} on:change={input_select}>
        <option value="linear"> Linear </option>
        <option value="slerp-naive"> Orthogonal (naive) </option>
        <!-- <option value="slerp-transposition-seq"> Orthogonal (transposition sequence) </option> -->
    </select>

    <!-- Possible feature: Take URL inputs -->

    <p>
    Provide a graph by giving a list or set of its edges:
    <textarea
        placeholder=" Example format:&#10;{`{{1, 2}, {2, 3}, {3, 1}}`}"
        on:input={handler_for_textarea(parse_graph)}
        class={graph_ok ? "ok" : "not-ok"}
        style="min-height: 6em;"
        bind:value={textarea_inputs.graph}
    />
    </p>

    <p>
        Give a 3D embedding for the vertices of the graph as a matrix with n rows and 3 columns:
        <textarea
            placeholder=" Example format: {`[[0.5, 0.5, 1], [-0.5, 0.5, 1], [0, -0.5, 1]]`}"
            on:input={handler_for_textarea(parse_matrix)}
            class={graph_ok ? "ok" : "not-ok"}
            style="min-height: 6em;"
            bind:value={textarea_inputs.matrix}
        />
    </p>

    Give an automorphism of the graph as a list:
    <textarea
        placeholder="Example format: [2, 3, 1]"
        on:input={handler_for_textarea(parse_permutation)}
        bind:value={textarea_inputs.permutation}
    />

    <!-- TODO: take a fixed input file path? -->
</div>

<div bind:this={stderr_div} class="stderr">
    <!-- Message output -->
</div>

<button> Load example graph </button>

<div>
    <h2>Usage</h2>

    <p>
        The labelling of graph vertices is assumed to be one-indexed, so that the vertex set must consist of integers  &lbrace;1  2, ..., n&rbrace;. 
    </p>

    <!-- More detail -->
    Accepted formats for the embedding matrix are:
    <ul>
        <li>An array of arrays (JSON)</li>
        <li>
            A line/space delimited file (as produced by <code>writedlm</code>),
            where each line contains a row of the matrix, within which the columns/entries are
            separated by spaces.
        </li>
    </ul>
    The canvas is then determined by a perspective projection through a pinhole camera located at (0, 0, -0.2) pointing towards the origin so that [-0.2, 0.2] x [-0.2, 0.2] x &lbrace;0&rbrace; spans the viewport. 
    
    <p>
    An automorphism should be specified as a list 'L' of n distinct vertex numbers (agreeing with the given edge
    set and row numbers of the embedding matrix) that defines a permutation sending vertex i to vertex L[i]. The list can be formatted as either a space-separated sequence of integers or as a JSON array. 
    </p>

    <em>Notes: </em> 
    <em><ul>
        <li> The orthogonal interpolation modes only work for even permutations. </li>
    </ul></em>
</div>

<style>
    textarea {
        width: 100%;
        padding: 0.5em;
    }

    .stderr {
        color: red;
    }
</style>
