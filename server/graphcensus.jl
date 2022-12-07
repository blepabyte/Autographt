module Census

using Random, SparseArrays
using Graphs

const RXP_GRAPH_DEF_AT = r"AT4val\[(\d+),(\d+)\] := Graph<(\d+) \| \{([^;]*?)\}>;"
const RXP_GRAPH_DEF_2AT = r"Tetra2AT\[(\d+),(\d+)\] := Graph<(\d+) \| \{([^;]*?)\}>;"
const RXP_EDGES = r"\{(\d+),\s?(\d+)\}"

"An arc-transitive 4-valent graph"
struct AT4val
	vertices
	num
	graph
    # mat
end

adj_mat(n, graph_str) = let re_edge = e -> parse.(Int, e)
	graph_edges = eachmatch(RXP_EDGES, graph_str) .|> re_edge
	# M = zero_matrix(F2, n, n)
	M = spzeros(Bool, n, n)
	for (u, v) in graph_edges
		M[u, v] = 1
		M[v, u] = 1
	end
	M
end

adj_mat(g::AT4val) = adjacency_matrix(g.graph)

function AT4val(init::RegexMatch)
	num_verts = parse(Int, init[1])
	num_graph = parse(Int, init[2])
	
	M = adj_mat(num_verts, init[4])
	G = SimpleGraph(M)
	
	AT4val(num_verts, num_graph, G)
end

function load_graphs(filename, expr; limit = nothing)
	matches = (collect ∘ eachmatch)(expr, read(filename, String))
	if !isnothing(limit)
		matches = matches[1:limit]
	end

	graphs::Vector{Union{AT4val, Nothing}} = fill(nothing, length(matches))

    Threads.@threads for (i, s) in shuffle(collect(enumerate(matches)))
		graphs[i] = AT4val(s)
	end
	graphs
end

function load_at(path = "./Census4val-640.mgm")
    load_graphs(path, RXP_GRAPH_DEF_AT)
end

export load_at

end
