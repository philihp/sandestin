import argparse
import random
import numpy as np 
import sys
from python_utils import Zome, transform_to_byte_str
import colorsys
import seaborn as sns
parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def snake_pattern(zome):
    n_snakes = 20
    update_interval = 1
    alpha = 100
    frame_id = 0
    buffer_length = 120
    color_palette = sns.color_palette('cubehelix')
    def make_snake():
        cur_edge_id = random.choice(np.arange(len(zome.edges)))
        cur_edge = zome.edges[cur_edge_id]
        cur_pos = random.randint(0, len(cur_edge["pixels"]))
        buffer = [0] * buffer_length
        forward = True
        color_template = random.choice(color_palette)
        def snake():
            nonlocal cur_edge_id, cur_pos, buffer, forward,color_template
            if frame_id % update_interval == 0:
                cur_pos += 1
                cur_edge = zome.edges[cur_edge_id]
                if cur_pos >= len(cur_edge['pixels']):
                    cur_pos = 0
                    next_node_i = cur_edge['endNode' if forward else 'startNode']
                    next_node = zome.nodes[next_node_i]
                    next_possible_edge_ids = [ i for i in next_node['edges'] if i!= cur_edge_id]
                    cur_edge_id = random.choice(next_possible_edge_ids)
                    cur_edge = zome.edges[cur_edge_id]
                    forward = cur_edge['startNode'] == next_node_i
                next_p = (cur_edge['pixels'] if forward else list(reversed(cur_edge['pixels'])))[cur_pos]
                buffer = buffer[1:] + [next_p]

            for i,p in enumerate(buffer):
                brightness = float(i)/buffer_length
                # color = np.array(color) * brightness
                # print(color)
                r, g, b = colorsys.hsv_to_rgb(color_template[0],color_template[1], brightness)
                color = np.array([r,g,b]) * 255 
                color = color.astype(int)
                rgba_values[p] = list(color) + [alpha] # combine the RGB, and alpha
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

