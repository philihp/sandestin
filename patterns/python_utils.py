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
        
    def height(self):
        all_z = [self.nodes[i]['point'][2] for i in range(len(self.nodes))]
        return np.max(all_z) 

    def width_x(self):
        all_x = [self.nodes[i]['point'][0] for i in range(len(self.nodes))]
        return np.max(all_x) 
     
    def width_y(self):
        all_y = [self.nodes[i]['point'][1] for i in range(len(self.nodes))]
        return np.max(all_y) 

    def get_inside_outside_strands_pixels(self):
        pixels_per_strand = [315, 360, 315, 360]  # repeats, index 0 and 2 are on same wood, 0 is out, index 1 and 3 are on same wood, 1 is out
        num_strands = 40
        start_channel = 0
        inside_strands = []
        outside_strands = []
        for strand in range(num_strands):
            pixels_in_strand = pixels_per_strand[strand % len(pixels_per_strand)]
            is_outside = strand % len(pixels_per_strand) >= 2
            end_channel = start_channel + pixels_in_strand
            if is_outside:
                outside_strands.append(np.arange(start_channel, end_channel))
            else:
                inside_strands.append(np.arange(start_channel, end_channel))
            start_channel += pixels_in_strand
        return  inside_strands, outside_strands,

    def get_inside_outside_strands_edges(self):
        edges_per_strand = [7, 8, 7, 8]  # repeats, index 0 and 2 are on same wood,  index 1 and 3 are on same wood. 0,1 is out, 2,3 is in
        num_strands = 40
        start_edge = 0
        inside_edges = []
        outside_edges = []
        for strand in range(num_strands):
            edges_in_strand = edges_per_strand[strand % len(edges_per_strand)]
            is_outside = strand % len(edges_per_strand) >= 2
            end_edge = start_edge + edges_in_strand
            if is_outside:
                outside_edges.append(np.arange(start_edge, end_edge))
            else:
                inside_edges.append(np.arange(start_edge, end_edge))
            start_edge += edges_in_strand
        return inside_edges, outside_edges
    
    def get_inside_outside_faces_edges(self):
        inside_edges, outside_edges = self.get_inside_outside_strands_edges()
        inside_faces = []
        outside_faces = []
        for strand_id in range(20):
            if strand_id % 2 == 0: #  looking at clockwise ones as lower left
                for i, edge_id in enumerate(inside_edges[strand_id]):
                    lower_left = edge_id
                    lower_right = inside_edges[(strand_id+1-2*i) % 20][i] # the next? strand, same position
                    upper_left =  inside_edges[(strand_id-1-2*i) % 20][i+1] # the prev? strand, same position + 1
                    if i < 6:
                        upper_right = inside_edges[(strand_id+2) % 20][i+1] # the next? 2 strand, same position + 1
                    else:
                        upper_right = inside_edges[(strand_id+1-2*i) % 20][i+1] # for last face special case, the upper right is next? strands, same position + 1
                    face = [lower_left,lower_right, upper_left, upper_right ]
                    inside_faces.append(face)

                for i, edge_id in enumerate(outside_edges[strand_id]):
                    lower_left = edge_id
                    lower_right = outside_edges[(strand_id+1-2*i) % 20][i] # the next? strand, same position
                    upper_left =  outside_edges[(strand_id-1-2*i) % 20][i+1] # the prev? strand, same position + 1
                    if i < 6:
                        upper_right = outside_edges[(strand_id+2) % 20][i+1] # the next? 2 strand, same position + 1
                    else:
                        upper_right = outside_edges[(strand_id+1-2*i) % 20][i+1] # for last face special case, the upper right is next? strands, same position + 1
                    face = [lower_left,lower_right, upper_left, upper_right ]
                    outside_faces.append(face)
                    
        return inside_faces, outside_faces


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
