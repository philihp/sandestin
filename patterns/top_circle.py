import argparse
import numpy as np 
import sys
import os 
import colorsys
from python_utils import Zome, transform_to_byte_str


parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def top_circle_pattern(zome):
    total_time_sec = 3 # TODO: can be a variable
    total_frames = total_time_sec * zome.fps
    topZ = zome.height()
    max_x = zome.width_x()
    max_y =  zome.width_y()
    length_factor = 0.7 # TODO: can be a variable 
    alpha = 255 #TODO: can be a variable 
    frame_id = 0
    num_pixels = len(zome.pixels)
    inside_strands_pixels, outside_strands_pixels = zome.get_inside_outside_strands_pixels()
    inside_strands_edges, outside_strands_edges = zome.get_inside_outside_strands_edges()

    while True:
        # for _ in range(total_frames):
        rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
        for strand_id in range(20):
            # for i, p in enumerate(inside_strands_pixels[strand_id]):
            #     rgba_values[p] = [255,0,0, 1]
            #     p2= outside_strands_pixels[strand_id][i]
            #     rgba_values[p2] = [0,255,0, 1]
            #     msg = transform_to_byte_str(frame_id, rgba_values)
            #     sys.stdout.buffer.write(msg) # this writes to the stdout which will be read by the app.js to send the frame. 
            #     frame_id += 1
            for i, edge_id in enumerate(inside_strands_edges[strand_id]):
                inside_edge = zome.edges[edge_id]
                outside_edge = zome.edges[outside_strands_edges[strand_id][i]]
                for j,p in enumerate(outside_edge['pixels']):
                    rgba_values[p] = [255,0,0, 1]
                    p2 = inside_edge['pixels'][j]
                    rgba_values[p2] = [0,255,0, 1]
                msg = transform_to_byte_str(frame_id, rgba_values)
                sys.stdout.buffer.write(msg) # this writes to the stdout which will be read by the app.js to send the frame. 
                frame_id += 1
    

if __name__ == "__main__":
    zome = Zome(args.model_file)
    top_circle_pattern(zome=zome)


