import argparse
import random
import numpy as np 
import sys
from python_utils import Zome, transform_to_byte_str

parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def top_down_pattern(zome):
    n_snakes = 30
    update_interval = 1

    alpha = 255 
    frame_id = 0

    def make_snake():
        cur_edge = zome.edges[0]
        cur_pos = 0
        buffer = [0] * 20
        forward = True
        def snake():
            nonlocal cur_edge, cur_pos, buffer, forward
            if frame_id % update_interval == 0:
                cur_pos += 1
                if cur_pos == len(cur_edge['pixels']):
                    cur_pos = 0
                    next_node_i = cur_edge['endNode' if forward else 'startNode']
                    next_node = zome.nodes[next_node_i]
                    cur_edge = zome.edges[random.choice(next_node['edges'])]
                    forward = cur_edge['startNode'] == next_node_i
                next_p = (cur_edge['pixels'] if forward else list(reversed(cur_edge['pixels'])))[cur_pos]
                buffer = buffer[1:] + [next_p]
            color = np.array([255, 0 , 0]) # TODO: can be a variable 
            color = color.astype(int)
            for p in buffer:
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
    # red_pattern(zome=zome)
    top_down_pattern(zome=zome)

