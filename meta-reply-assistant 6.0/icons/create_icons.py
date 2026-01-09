from PIL import Image
import cairosvg
import io

# Convert SVG to PNG at different sizes
svg_file = 'icon.svg'
sizes = [16, 48, 128]

for size in sizes:
    png_data = cairosvg.svg2png(url=svg_file, output_width=size, output_height=size)
    img = Image.open(io.BytesIO(png_data))
    img.save(f'icon{size}.png', 'PNG')
    print(f'Created icon{size}.png')

print('Done!')
