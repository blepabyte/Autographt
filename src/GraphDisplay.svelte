<script lang="ts">
    import * as Graphs from "./math/Graphs";

    export let DisplayGraph: Graphs.Graph;
    export let Interpolate: Graphs.Interpolation = null;
    export let InputComponent;

    export let playing = true;

    import { onMount, onDestroy } from "svelte";

    import { SVG, type Svg } from "@svgdotjs/svg.js";
    import { Matrix } from "ml-matrix";

    import { Projective } from "./math/Projective";

    // UI BINDS
    let permutation_t = 0;
    let container; // encapsulate container, init, somehow

    //
    let svgjs: Svg; // view area: [-1, 1] x [-1, 1]
    let P = new Projective(DisplayGraph.nv);
    // P.set_real(DisplayGraph.positions)
    P.set_positions(DisplayGraph.positions);

    let M = P.real_matrix();

    let vertex_svgs = [];
    let edge_svgs = [];

    let ready = false;

    // TODO: Maybe an animation control component or something...
    let ticker = setInterval(() => {
        if (playing) permutation_t = (permutation_t + 0.5) % 100;
    }, 32);

    // want an "onReady" event when all the slow shit has loaded

    // Let's try get all the necessary information from the "Graph" interface

    onMount(() => {
        svgjs = SVG().addTo(container).size("100%", "100%");
        svgjs.viewbox("-1 -1 2 2");

        draw_first_time();

        // $: at_permute_time(permutation_t / 100)
    });
    onDestroy(() => {
        clearInterval(ticker);
    });

    function draw_first_time() {
        let G = DisplayGraph;
        // put vertices in a place, and let caller move them around
        for (let v = 0; v < G.nv; v++) {
            let [cx, cy, depth] = P.at(v);
            vertex_svgs.push(
                svgjs.circle().attr({ cx, cy, fill: "#000", r: 0.02 })
            );
        }

        for (let [a, b] of G.edges) {
            let [ax, ay, ad] = P.at(a);
            let [bx, by, bd] = P.at(b);
            edge_svgs.push(
                svgjs.line().plot(ax, ay, bx, by).stroke({
                    width: 0.007,
                    color: "#000000",
                })
            );
        }

        ready = true;
    }

    function draw_update() {
        // Assumes vertices, edges, stored in a fixed order

        // TODO: use opacity instead of colour

        let G = DisplayGraph;
        for (let v = 0; v < G.nv; v++) {
            let [cx, cy, depth] = P.at(v);
            vertex_svgs[v].attr({ cx, cy, opacity: P.opacity(v) });
        }

        let e = 0;
        for (let [a, b] of G.edges) {
            let [ax, ay, ad] = P.at(a);
            let [bx, by, bd] = P.at(b);
            edge_svgs[e].plot(ax, ay, bx, by).attr({
                opacity: Math.max(P.opacity(a), P.opacity(b))
            });
            e++;
        }
    }

    let morber;
    try {
        morber = Graphs.interp(
            Interpolate === null ? { spec: "noop" } : Interpolate
        );
    } catch (e) {
        console.error(e);
        InputComponent.write_stderr("Interpolation failed. Probable cause: the given permutation is not even.")
        morber = Graphs.interp({ spec: "noop" });
    }

    function at_permute_time(t: number) {
        let m1 = morber(M.getColumnVector(0), t);
        // console.log()
        P.reset_real_cols(
            m1,
            morber(M.getColumnVector(1), t),
            morber(M.getColumnVector(2), t)
        );

        draw_update();
    }
    // TODO: animation component, somehow handle state in a "not awful" way
    $: ready ? at_permute_time(permutation_t / 100) : null;
</script>

<div class="graph-display-container" bind:this={container} />

<div class="controls">
    <input
        type="range"
        min="0"
        max="100"
        bind:value={permutation_t}
        class="slider"
    />
    (Play)

    <input type="checkbox" bind:checked={playing} />
</div>

<style>
    .graph-display-container {
        width: 100%;
        max-width: calc(min(90vw, 90vh));
    }

    .controls {
        width: 100%;
    }

    .slider {
        width: 33%;
    }
</style>
