import argparse
import random
import numpy as np 
import sys
from python_utils import Zome, transform_to_byte_str
import matplotlib as plt 

parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def snake_pattern(zome):
    n_snakes = 20
    update_interval = 1
    alpha = 100
    frame_id = 0
    buffer_length = 160 #for both inside and outside, so actual length for one side is half of this value
    update_color_interval = 400
    num_colors = 20
    color_map_names = random.choices(plt.colormaps(), k=num_colors)
    # color_palette = sns.color_palette('cubehelix')
    inside_strands_edges, outside_strands_edges = zome.get_inside_outside_strands_edges()
    all_inside_edges = [edge for strands in inside_strands_edges for edge in strands]
    all_outside_edges = [edge for strands in outside_strands_edges for edge in strands]
    def make_snake():
        cur_edge_id = random.choice(all_inside_edges)
        cur_edge_inside = zome.edges[cur_edge_id]
        # find corresponding outside edge
        ind = all_inside_edges.index(cur_edge_id)
        cur_edge_outside = zome.edges[all_outside_edges[ind]]
        cur_pos = random.randint(0, len(cur_edge_inside["pixels"]))
        buffer = [0] * buffer_length
        forward = True
        color_map = plt.colormaps.get_cmap(color_map_names[0])
        color_id = 0
        def snake():
            nonlocal cur_edge_id, cur_pos, buffer, forward, color_map, color_map_names, color_id
            if frame_id % update_interval == 0:
                cur_pos += 1
                cur_edge_inside = zome.edges[cur_edge_id]
                # find corresponding outside edge
                ind = all_inside_edges.index(cur_edge_id)
                cur_edge_outside = zome.edges[all_outside_edges[ind]]
                if cur_pos >= len(cur_edge_inside['pixels']):
                    cur_pos = 0
                    next_node_i = cur_edge_inside['endNode' if forward else 'startNode']
                    next_node = zome.nodes[next_node_i]
                    next_possible_edge_ids = [ i for i in next_node['edges'] if i!= cur_edge_id]
                    cur_edge_id = random.choice(next_possible_edge_ids)
                    cur_edge_inside = zome.edges[cur_edge_id]
                    # find corresponding outside edge
                    ind = all_inside_edges.index(cur_edge_id)
                    cur_edge_outside = zome.edges[all_outside_edges[ind]]
                    forward = cur_edge_inside['startNode'] == next_node_i
                next_p_inside = (cur_edge_inside['pixels'] if forward else list(reversed(cur_edge_inside['pixels'])))[cur_pos]
                next_p_outside = (cur_edge_outside['pixels'] if forward else list(reversed(cur_edge_outside['pixels'])))[cur_pos]
                buffer = buffer[2:] + [next_p_inside, next_p_outside]
            if frame_id!=0 and frame_id % update_color_interval == 0:
                color_id = color_id + 1 if color_id < num_colors-1 else 0
                color_map = plt.colormaps.get_cmap(color_map_names[color_id])
            rgbas = color_map(np.linspace(0,1,len(buffer))) #map color to each location in buffer, indexes normalized to 0-1
            # brightness = np.repeat(buffer_indices/buffer_length, 4, axis=1)
            rgbas = (rgbas * 255).astype(int)
            for i,p in enumerate(buffer):
                rgba_values[p] = rgbas[i]
        return snake
    
    snakes = [make_snake() for _ in range(n_snakes)]
    while True:
        rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros
        for snake in snakes: 
            snake()
        msg = transform_to_byte_str(frame_id, rgba_values)
        sys.stdout.buffer.write(msg)
        frame_id += 1



if __name__ == "__main__":
    sys.stderr.write(f"loading file {args.model_file}\n")
    zome = Zome(args.model_file)
    snake_pattern(zome=zome)

