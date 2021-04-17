from trp import trp2

def test_tblock():
    polygon_coordinates = [trp2.TPolygonCoordinates(x=0.4, y=0.1)]
    polygon = trp2.TPolygon(coordinates=polygon_coordinates)
    geometry = trp2.TGeometry(polygon=polygon)
    block = trp2.TBlock(geometry=geometry)
    print(block.__dict__)

