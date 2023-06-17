import struct
import numpy as np
import json 

class Zome:
    def __init__(self, model_file):
        with open(model_file) as f:
            model_json = json.load(f)
        self.edges = model_json['model']['edges']
        self.nodes = model_json['model']['nodes']
        self.pixels = model_json['model']['pixels']
        self.num_pixels = len(self.pixels)
        self.fps = model_json['framesPerSecond']

    @property
    def height(self):
        all_z = [self.nodes[i]['point'][2] for i in range(len(self.nodes))]
        return np.max(all_z) 
    
    @property
    def width_x(self):
        all_x = [self.nodes[i]['point'][0] for i in range(len(self.nodes))]
        return np.max(all_x) 
    
    @property
    def width_y(self):
        all_y = [self.nodes[i]['point'][1] for i in range(len(self.nodes))]
        return np.max(all_y) 


def transform_to_byte_str(frame_id: int, rgba_values: list) -> str:
    """Transform the rgba values for all leds in a frame to bytes str for printing. 

    Args:
        frame_id (int): current frame id 
        rgba_values (list[int]): the entire list of led rgba values, it will be list of list of 4 ints. Like [[255,0,0,255], [23,32,41,0]]

    Returns:
        str: a byte string to output to the led controller 
    """
    message =  struct.pack('<I', frame_id) #start with frame_id, turn it into a little endian 4 byte unsigned int
    message += struct.pack('BBBB' * len(rgba_values), *(value for rgba in rgba_values for value in rgba))
    return message 
