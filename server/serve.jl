TERM_PLOT = false
TERM_PLOT && using KittyTerminalImages

using Random
using Graphs, GraphPlot, NetworkLayout
import Oscar

using Genie
using Genie.Renderer.Json

function Oscar.Graph(G::Graph)
    OG = Oscar.Graph{Oscar.Undirected}(nv(G))
    foreach(edges(G) .|> Tuple) do (u, v)
        Oscar.add_edge!(OG, u, v)
    end
    OG
end

# module Census
include("graphcensus.jl")
using .Census

GS = Census.load_at()
GS_at_most_108 = filter(G -> G.vertices <= 108, GS)

TERM_PLOT && begin
    gplot(rand(GS).graph) |> display
end

function autographt(G::Graph)
    OG = Oscar.Graph(G)
    embedding = spring_layout(G)
    aut_G = Oscar.automorphism_group(OG)

    # So that orthogonal interp will always work. The intersection also returns some group homomorphisms, _ which are discarded
    aut_even_G, _, _ = aut_G ∩ Oscar.alternating_group(nv(G))
    aut = rand(aut_even_G)
    display(aut)

    # both GraphPlot and NetworkLayout implement graph embedding algorithms
    # GP: 2-dimensional only, supports image output
    # NL: arbitrary dims

    nl_spring_layout_3d = reduce(hcat, spring(G, dim=3)) # 3 x n matrix
    nl_spring_layout_3d ./= maximum(nl_spring_layout_3d) * 5 # 0.2 maximum
    # nl_spring_layout_3d[3, :] .+= 0.1 # shift slightly further from camera
    # a more intelligent algorithm (and programmer) would try to fit it properly in viewport

    embedding = nl_spring_layout_3d
    Dict(
        "graph" => edges(G) .|> Tuple,
        "matrix" => collect(eachcol(embedding)),
        "permutation" => Vector(aut)
    )
end


# Serve over HTTP

Genie.config.cors_allowed_origins = ["*"]

route("/") do 
    autographt(rand(GS_at_most_108).graph) |> json
end

# if run with `julia serve.jl` seems to segfault, possibly because this command doesn't block so stuff starts getting freed as it tries to exit?
up(7733, "127.0.0.1")

