import argparse
import numpy as np 
import sys
import os 
import colorsys
from python_utils import Zome, transform_to_byte_str
import random
import matplotlib as plt 

parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def spider_pattern(zome):
    frame_id = 0
    inside_strands_pixels, outside_strands_pixels = zome.get_inside_outside_strands_pixels()
    inside_strands_edges, outside_strands_edges = zome.get_inside_outside_strands_edges()
    update_color_interval = 500

    target_length_per_strand = target_length_per_strand = [random.randint(10, 100) for _ in range(20)]
    cur_length_per_strand =  np.zeros(20).astype(int) # TODO: maybe randomize
    num_colors = 20
    color_id = 0
    color_map_names = random.choices(plt.colormaps(), k=num_colors)
    color_map = plt.colormaps.get_cmap(color_map_names[0])
    while True:
        # for _ in range(total_frames):
        rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
        if frame_id!=0 and frame_id % update_color_interval == 0:
                color_id = color_id + 1 if color_id < num_colors-1 else 0
                color_map = plt.colormaps.get_cmap(color_map_names[color_id])

        for strand_id in range(20):
            if target_length_per_strand[strand_id] > cur_length_per_strand[strand_id]:
                cur_length_per_strand[strand_id] += 1
            elif target_length_per_strand[strand_id] == cur_length_per_strand[strand_id]:
                 target_length_per_strand[strand_id] = random.randint(10, 240)
            else:
                cur_length_per_strand[strand_id] -= 1
            buffer_in = inside_strands_pixels[strand_id][::-1][:cur_length_per_strand[strand_id]] 
            buffer_out = outside_strands_pixels[strand_id][::-1][:cur_length_per_strand[strand_id]] 
            rgbas = color_map(np.linspace(0,1,len(buffer_in))) #map color to each location in buffer, indexes normalized to 0-1
            # brightness = np.repeat(buffer_indices/buffer_length, 4, axis=1)
            rgbas = (rgbas * 255).astype(int)
            for i,p in enumerate(buffer_in):
                rgba_values[p] = rgbas[i]
                p2 = buffer_out[i]
                rgba_values[p2] = rgbas[i]

        msg = transform_to_byte_str(frame_id, rgba_values)
        sys.stdout.buffer.write(msg) # this writes to the stdout which will be read by the app.js to send the frame. 
        frame_id += 1


if __name__ == "__main__":
    zome = Zome(args.model_file)
    spider_pattern(zome=zome)


