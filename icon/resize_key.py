from PIL import Image
import os

base_dir = r"c:\Users\ajsaj\Documents\python\production_build\icon"
img_path = os.path.join(base_dir, "1024", "key.png")

try:
    img = Image.open(img_path)
    width, height = img.size
    print(f"Original size: {width}x{height}")

    diff = height - width
    if diff > 0:
        left = 0
        top = diff
        right = width
        bottom = height
        img = img.crop((left, top, right, bottom))
        print(f"Cropped size: {img.size}")
    else:
        print("Image is already square or width > height")

    sizes = [1024, 512, 256, 128, 64, 32, 16]
    for size in sizes:
        folder = os.path.join(base_dir, str(size))
        if not os.path.exists(folder):
            os.makedirs(folder)
        
        # Using LANCZOS for high-quality downsampling/upsampling
        resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
        save_path = os.path.join(folder, "key.png")
        resized_img.save(save_path)
        print(f"Saved {size}x{size} to {save_path}")

    print("Successfully cropped and resized key.png.")
except Exception as e:
    print(f"An error occurred: {e}")
