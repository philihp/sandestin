import argparse
import numpy as np 
import sys
import os 
import colorsys
from python_utils import Zome, transform_to_byte_str
import matplotlib as plt 

parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def heartbeat_pattern(zome):
    total_time_sec = 3 # TODO: can be a variable
    total_frames = total_time_sec * zome.fps
    topZ = zome.height()
    frame_id = 0
    color_map = plt.colormaps.get_cmap(zome.options['color_map_name'])
    while True:
        timeBias = frame_id / zome.fps
        for _ in range(total_frames):
            rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
            # thresholdZ = topZ * ( 1 - (frame_id % total_frames) / total_frames) 
            thresholdZ = topZ * (0.5 + 0.5 * np.sin(frame_id/10))
            length_factor = max( 0.2, 0.5 + 0.5 * np.cos(frame_id/10))
            orders = [p[2]/topZ for p in zome.pixels]
            shifted_orders = np.roll(orders, int(frame_id))
            colors = color_map(shifted_orders)
            colors = (colors * 255).astype(int)
            for i, p in enumerate(zome.pixels):
                if p[2] > thresholdZ:
                    brightness = 1 - (p[2] - thresholdZ) / (topZ * length_factor)
                    if brightness > 0:
                        rgba_values[i] = colors[i]  # combine the RGB, and alpha
                        # print(color,  brightness)
            msg = transform_to_byte_str(frame_id, rgba_values)
            sys.stdout.buffer.write(msg) # this writes to the stdout which will be read by the app.js to send the frame. 
            frame_id += 1

    

if __name__ == "__main__":
    zome = Zome(args.model_file)
    heartbeat_pattern(zome=zome)


