from PIL import Image, ImageDraw

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 画一个圆形背景
    padding = size // 8
    draw.ellipse([padding, padding, size - padding, size - padding], 
                 fill='#1877f2')
    
    # 画一个简单的消息图标
    center = size // 2
    box_size = size // 3
    draw.rectangle([center - box_size//2, center - box_size//2, 
                   center + box_size//2, center + box_size//2],
                  fill='white')
    
    return img

# 创建三种尺寸
for s in [16, 48, 128]:
    img = create_icon(s)
    img.save(f'icon{s}.png')
    print(f'Created icon{s}.png')
