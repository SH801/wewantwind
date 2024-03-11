from PIL import Image

background = Image.open("downloads/All constraints.png")
foreground = Image.open("scale.png")
background.paste(foreground, ((600 * 3) - 286, (500 * 3) - 66), foreground)
background.save('new.png')
# .save("image_with_scale.png")