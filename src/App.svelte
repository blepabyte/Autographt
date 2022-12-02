<script lang="ts">
    import GraphInput from "./GraphInput.svelte";
    import GraphDisplay from "./GraphDisplay.svelte";
    import * as Graphs from "./math/Graphs";
    import { Matrix } from "ml-matrix";
    
    let P;
    let G;

    async function fetch_json(url) {
        let r = await fetch(url);
        let j = await r.json();
        return j;
    }

    // TODO: hacky, load properly
    let load_graph_promise = (async () => {
        let r = await fetch_json("data/embed-6.json");
        // tranpose positions
        G = {
            nv: r.positions[0].length,
            positions: new Matrix(r.positions).transpose(),
            edges: r.edges.map((e) => [e[0] - 1, e[1] - 1]),
        };

        let naive_seq = {
            spec: "linear",
            permutation: await fetch_json("data/perm-seq-xi.json"),
        } as Graphs.Interpolation;

        let adjacent_seq = {
            spec: "slerp-transposition-seq",
            transposition: await fetch_json("data/atr-seq-gamma.json"),
            n: G.nv,
        } as Graphs.Interpolation;

        P = naive_seq;
        // P = adjacent_seq

        console.log("Graph promise loaded");
    })();
</script>

<main>
    <div class="left">
        {#await load_graph_promise}
            <div class="graph-display">
                <GraphDisplay DisplayGraph={Graphs.default_graph()} />
            </div>
        {:then}
            {#key [G, P]}
                <!-- <div class="graph-display"> -->
                    <GraphDisplay
                        DisplayGraph={G}
                        Interpolate={P}
                    />
                <!-- </div> -->
            {/key}
        {/await}
    </div>

    <div class="right">
        <h2>Graph automorphism animator</h2>

        <div class="graph-input">
            <GraphInput bind:InGraph={G} bind:InTerpolate={P} />
        </div>

        <p class="read-the-docs">~2022</p>
    </div>
</main>

<style>
    .read-the-docs {
        color: #888;
    }

    main {
        display: flex;
        flex-direction: row;
    }

    .left {
        flex: 2;
        display: flex;
        place-items: center;
        text-align: center;
        flex-direction: column;
    }

    .right {
        flex: 1;
    }

    @media (max-aspect-ratio: 1.1) {
        main {
            flex-direction: column;
        }
    }
</style>
