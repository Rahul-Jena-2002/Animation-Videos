"""
Generate multi-plane painterly manhwa fantasy landscape assets for Remotion parallax scene.
Location: aetheria_ancient_sky
Target resolution: 2400 x 1350 for smooth 2.5D camera overscan.
"""
import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 2400, 1350
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "bg", "aetheria_ancient_sky")
os.makedirs(OUT_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# Helper utilities
# -----------------------------------------------------------------------------
def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)

def add_glow(img, radius=12):
    blurred = img.filter(ImageFilter.GaussianBlur(radius))
    return Image.alpha_composite(blurred, img)

# -----------------------------------------------------------------------------
# 1. Sky Plane (sky.png)
# -----------------------------------------------------------------------------
def make_sky():
    print("Generating sky.png...")
    # Base cosmic gradient: deep obsidian -> midnight navy -> celestial violet -> nebula magenta
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    
    # Non-linear color mapping across full 2D grid
    c_top = np.array([6, 3, 18], dtype=np.float32)       # #060312
    c_mid1 = np.array([22, 10, 48], dtype=np.float32)    # #160a30
    c_mid2 = np.array([55, 18, 86], dtype=np.float32)    # #371256
    c_bot = np.array([88, 30, 110], dtype=np.float32)    # #581e6e
    
    m1 = np.clip(y / 0.35, 0, 1)[:, :, None]
    m2 = np.clip((y - 0.35) / 0.35, 0, 1)[:, :, None]
    m3 = np.clip((y - 0.70) / 0.30, 0, 1)[:, :, None]
    
    # Broadcast across (H, W, 3)
    c_top_grid = np.broadcast_to(c_top, (H, W, 3))
    c_mid1_grid = np.broadcast_to(c_mid1, (H, W, 3))
    c_mid2_grid = np.broadcast_to(c_mid2, (H, W, 3))
    c_bot_grid = np.broadcast_to(c_bot, (H, W, 3))
    
    rgb = c_top_grid * (1 - m1) + c_mid1_grid * m1
    rgb = rgb * (1 - m2) + c_mid2_grid * m2
    rgb = rgb * (1 - m3) + c_bot_grid * m3
    
    # Add procedural cosmic nebula clouds using multi-frequency sine waves
    nebula = np.sin(x * 6 + y * 4) * 0.5 + np.cos(x * 12 - y * 8) * 0.25 + np.sin(x * 18 + y * 14) * 0.125
    nebula = np.clip((nebula + 0.8) / 1.6, 0, 1)
    nebula_color = np.array([120, 40, 180], dtype=np.float32)  # luminous violet
    cyan_tint = np.array([40, 140, 210], dtype=np.float32)     # astral cyan
    
    mix_factor = (nebula[:, :, None] ** 2) * 0.45
    rgb = rgb * (1 - mix_factor) + (nebula_color * 0.7 + cyan_tint * 0.3) * mix_factor
    
    sky_img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), mode="RGB").convert("RGBA")
    draw = ImageDraw.Draw(sky_img)
    
    # Cosmic Aurora Ribbon
    aurora = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(aurora)
    pts = []
    for px in range(0, W, 20):
        py = 420 + math.sin(px * 0.003) * 120 + math.cos(px * 0.007) * 60
        pts.append((px, py))
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        a_draw.line([(x1, y1), (x2, y2)], fill=(70, 220, 230, 110), width=35)
        a_draw.line([(x1, y1 + 15), (x2, y2 + 15)], fill=(180, 80, 255, 90), width=45)
    aurora = aurora.filter(ImageFilter.GaussianBlur(28))
    sky_img = Image.alpha_composite(sky_img, aurora)
    draw = ImageDraw.Draw(sky_img)
    
    # Starfield: 1200 distinct stars
    np.random.seed(42)
    star_x = np.random.randint(0, W, 1200)
    star_y = np.random.randint(0, int(H * 0.85), 1200)
    star_r = np.random.choice([1, 1, 1, 2, 2, 3, 4], 1200, p=[0.5, 0.25, 0.12, 0.08, 0.03, 0.015, 0.005])
    
    for sx, sy, sr in zip(star_x, star_y, star_r):
        color_choice = np.random.choice(["white", "cyan", "gold", "violet"], p=[0.6, 0.2, 0.15, 0.05])
        if color_choice == "white":
            sc = (255, 255, 255, 220)
        elif color_choice == "cyan":
            sc = (180, 240, 255, 240)
        elif color_choice == "gold":
            sc = (255, 230, 160, 240)
        else:
            sc = (220, 180, 255, 200)
            
        draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=sc)
        if sr >= 3:
            # 4-point diffraction spike
            draw.line([sx - sr * 4, sy, sx + sr * 4, sy], fill=(sc[0], sc[1], sc[2], 120), width=1)
            draw.line([sx, sy - sr * 4, sx, sy + sr * 4], fill=(sc[0], sc[1], sc[2], 120), width=1)
            
    # The 7 Fallen Celestial Stars (Grand Fracture Lore)
    falling_stars = [
        (350, 180, 720, 680, (255, 220, 100)),   # Life (Golden)
        (780, 120, 1150, 620, (140, 230, 255)),  # Light (Cyan)
        (1200, 90, 1580, 580, (255, 130, 200)),  # Memory (Rose)
        (1650, 140, 2050, 660, (180, 140, 255)), # Time (Amethyst)
        (480, 320, 840, 780, (255, 255, 255)),   # Creation (White Star)
        (1450, 280, 1820, 740, (100, 255, 200)), # Growth (Emerald Cyan)
        (1900, 240, 2280, 710, (255, 180, 90)),  # Shadow's Twin (Amber)
    ]
    
    for x1, y1, x2, y2, color in falling_stars:
        # Comet trail with fading tail
        trail_pts = 40
        for step in range(trail_pts):
            t0 = step / trail_pts
            t1 = (step + 1) / trail_pts
            px0 = x1 + (x2 - x1) * t0
            py0 = y1 + (y2 - y1) * t0
            px1 = x1 + (x2 - x1) * t1
            py1 = y1 + (y2 - y1) * t1
            alpha = int(255 * (t1 ** 2.2))
            w_line = max(1, int(7 * (t1 ** 1.5)))
            draw.line([(px0, py0), (px1, py1)], fill=(color[0], color[1], color[2], alpha), width=w_line)
            
        # Blazing comet head
        hx, hy = x2, y2
        for r_glow in [22, 14, 8, 4]:
            a_glow = int(255 * (1.0 - r_glow / 26))
            draw.ellipse([hx - r_glow, hy - r_glow, hx + r_glow, hy + r_glow],
                         fill=(color[0], color[1], color[2], a_glow))
        draw.ellipse([hx - 3, hy - 3, hx + 3, hy + 3], fill=(255, 255, 255, 255))
        # Burst rays
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            rx = hx + math.cos(rad) * 28
            ry = hy + math.sin(rad) * 28
            draw.line([(hx, hy), (rx, ry)], fill=(255, 255, 255, 160), width=2)
            
    sky_img.save(os.path.join(OUT_DIR, "sky.png"), "PNG")
    print("sky.png saved.")

# -----------------------------------------------------------------------------
# 2. Far Mountains & Floating Monoliths (far_mountains.png)
# -----------------------------------------------------------------------------
def make_far_mountains():
    print("Generating far_mountains.png...")
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 4 Layers of distant mountain silhouettes with textured crags
    # Back range: Deep violet-indigo, very high jagged peaks
    np.random.seed(101)
    pts_back = [(0, H)]
    for x in range(0, W + 40, 15):
        base_h = 520
        wave = math.sin(x * 0.002) * 160 + math.cos(x * 0.005) * 90 + np.random.normal(0, 22)
        pts_back.append((x, int(base_h + wave)))
    pts_back.append((W, H))
    draw.polygon(pts_back, fill=(28, 16, 52, 235))
    
    # Starlight snowcaps on back peaks
    for i in range(1, len(pts_back) - 2):
        if pts_back[i][1] < 480:
            draw.line([pts_back[i], pts_back[i+1]], fill=(200, 220, 255, 180), width=4)
    
    # Mid mountain range: cooler navy with glowing edge
    pts_mid = [(0, H)]
    for x in range(0, W + 40, 15):
        base_h = 640
        wave = math.sin(x * 0.0035 + 1.2) * 120 + math.cos(x * 0.008) * 70 + np.random.normal(0, 18)
        pts_mid.append((x, int(base_h + wave)))
    pts_mid.append((W, H))
    draw.polygon(pts_mid, fill=(22, 18, 48, 245))
    # Glowing magical veins on mid peaks
    for i in range(1, len(pts_mid) - 2):
        draw.line([pts_mid[i], pts_mid[i+1]], fill=(120, 180, 255, 140), width=3)
        if i % 8 == 0:
            # Crevice lines
            draw.line([pts_mid[i], (pts_mid[i][0] + 15, pts_mid[i][1] + 60)], fill=(80, 140, 220, 100), width=2)
        
    # Floating celestial rock monoliths (7 floating islands)
    monoliths = [
        (260, 460, 140, 95),
        (520, 360, 190, 130),
        (840, 440, 120, 80),
        (1380, 320, 240, 150),
        (1720, 390, 160, 105),
        (2040, 330, 210, 140),
        (2280, 450, 130, 90),
    ]
    for mx, my, mw, mh in monoliths:
        # Floating island shape (flat top, jagged bottom)
        poly = [
            (mx - mw//2, my),
            (mx - mw//3, my - mh//6),
            (mx + mw//3, my - mh//6),
            (mx + mw//2, my),
            (mx + mw//4, my + mh//2),
            (mx + 8, my + mh),
            (mx - mw//4, my + mh//2),
        ]
        draw.polygon(poly, fill=(38, 28, 62, 255), outline=(110, 95, 150, 220), width=2)
        # Ancient glowing runic spires on the floating island
        draw.line([(mx, my - mh//6), (mx, my - mh//2)], fill=(100, 230, 255, 240), width=4)
        draw.ellipse([mx - 7, my - mh//2 - 7, mx + 7, my - mh//2 + 7], fill=(200, 255, 255, 255))
        # Cascading starlight energy trail hanging below island
        for trail_step in range(8):
            ty = my + mh + trail_step * 14
            tw = max(1, 12 - trail_step)
            ta = int(200 * (1 - trail_step / 8))
            draw.line([(mx - tw, ty), (mx + tw, ty)], fill=(80, 210, 255, ta), width=2)
        
    # Atmospheric mist at the valley bottom
    mist = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    m_draw = ImageDraw.Draw(mist)
    m_draw.rectangle([0, 720, W, H], fill=(70, 45, 105, 160))
    mist = mist.filter(ImageFilter.GaussianBlur(40))
    img = Image.alpha_composite(img, mist)
    
    img.save(os.path.join(OUT_DIR, "far_mountains.png"), "PNG")
    print("far_mountains.png saved.")

# -----------------------------------------------------------------------------
# 3. Midground Ruins & Sanctuaries (midground.png)
# -----------------------------------------------------------------------------
def make_midground():
    print("Generating midground.png...")
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Grand ruined celestial cathedral / Star Sanctum arches
    # Left colonnade
    for col_x in [160, 320, 480]:
        col_w = 48
        draw.rectangle([col_x - col_w//2, 540, col_x + col_w//2, 920], fill=(42, 32, 60, 255), outline=(80, 65, 105, 220), width=3)
        # Capital & base
        draw.rectangle([col_x - col_w//2 - 12, 520, col_x + col_w//2 + 12, 540], fill=(55, 42, 78, 255))
        draw.rectangle([col_x - col_w//2 - 16, 920, col_x + col_w//2 + 16, 950], fill=(55, 42, 78, 255))
        # Glowing vertical star runes along columns
        for ry in range(580, 890, 50):
            draw.line([(col_x - 10, ry), (col_x + 10, ry)], fill=(240, 200, 100, 190), width=3)
            draw.point((col_x, ry - 12), fill=(255, 240, 180, 255))
            
    # Right colonnade
    for col_x in [1920, 2080, 2240]:
        col_w = 48
        draw.rectangle([col_x - col_w//2, 540, col_x + col_w//2, 920], fill=(42, 32, 60, 255), outline=(80, 65, 105, 220), width=3)
        draw.rectangle([col_x - col_w//2 - 12, 520, col_x + col_w//2 + 12, 540], fill=(55, 42, 78, 255))
        draw.rectangle([col_x - col_w//2 - 16, 920, col_x + col_w//2 + 16, 950], fill=(55, 42, 78, 255))
        for ry in range(580, 890, 50):
            draw.line([(col_x - 10, ry), (col_x + 10, ry)], fill=(240, 200, 100, 190), width=3)
            
    # Soaring central ruined gothic arch (connecting ruins behind stage)
    arch_cx = 1200
    arch_pts_out = []
    arch_pts_in = []
    for deg in range(0, 185, 5):
        rad = math.radians(deg)
        rx_out = math.cos(rad) * 440
        ry_out = math.sin(rad) * 360
        arch_pts_out.append((arch_cx + rx_out, 680 - ry_out))
        rx_in = math.cos(rad) * 380
        ry_in = math.sin(rad) * 310
        arch_pts_in.append((arch_cx + rx_in, 680 - ry_in))
        
    full_arch = arch_pts_out + arch_pts_in[::-1]
    draw.polygon(full_arch, fill=(46, 36, 68, 255), outline=(100, 80, 135, 230), width=3)
    
    # Cascade of starlight waterfall from the central floating keystone
    waterfall = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    w_draw = ImageDraw.Draw(waterfall)
    for wf_x in range(1160, 1241, 10):
        w_draw.line([(wf_x, 620), (wf_x + np.random.normal(0, 8), 980)], fill=(120, 240, 255, 140), width=5)
    waterfall = waterfall.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, waterfall)
    
    # Glowing celestial crystals growing from ruins
    crystals = [
        (480, 920, 45, 110, (100, 220, 255)),
        (520, 930, 35, 80, (255, 140, 220)),
        (1880, 920, 50, 120, (255, 210, 100)),
        (1930, 935, 30, 75, (120, 240, 255)),
    ]
    for cx, cy, cw, ch, col in crystals:
        c_poly = [
            (cx, cy - ch),
            (cx + cw//2, cy - ch//2),
            (cx + cw//3, cy),
            (cx - cw//3, cy),
            (cx - cw//2, cy - ch//2),
        ]
        draw.polygon(c_poly, fill=(col[0], col[1], col[2], 220), outline=(255, 255, 255, 240), width=2)
        # Inner glow line
        draw.line([(cx, cy - ch + 8), (cx, cy - 8)], fill=(255, 255, 255, 220), width=3)
        
    img.save(os.path.join(OUT_DIR, "midground.png"), "PNG")
    print("midground.png saved.")

# -----------------------------------------------------------------------------
# 4. Stage Ground Dais (stage_ground.png)
# -----------------------------------------------------------------------------
def make_stage_ground():
    print("Generating stage_ground.png...")
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Stage floor begins at Horizon Y = 780 down to H = 1350
    # Polished obsidian stone terrace with perspective tile grid
    stage_top = 780
    
    # Stone slab gradient
    dh = H - stage_top
    y_vals = np.linspace(0, 1, dh)[:, None, None]
    c_stone_top = np.array([32, 24, 46], dtype=np.float32)  # #20182e
    c_stone_bot = np.array([16, 12, 24], dtype=np.float32)  # #100c18
    rgb_stone = c_stone_top * (1 - y_vals) + c_stone_bot * y_vals  # shape (dh, 1, 3)
    rgb_stone = np.broadcast_to(rgb_stone, (dh, W, 3))
    
    floor_arr = np.zeros((H, W, 4), dtype=np.uint8)
    floor_arr[stage_top:, :, :3] = np.clip(rgb_stone, 0, 255).astype(np.uint8)
    floor_arr[stage_top:, :, 3] = 255
    
    img = Image.fromarray(floor_arr, mode="RGBA")
    draw = ImageDraw.Draw(img)
    
    # Perspective tile lines converging to horizon center (1200, 780)
    for px in range(-400, W + 600, 120):
        draw.line([(1200, stage_top), (px, H)], fill=(55, 45, 75, 140), width=2)
    # Horizontal stone slab seams
    seams = [820, 875, 940, 1020, 1120, 1240, 1350]
    for sy in seams:
        draw.line([(0, sy), (W, sy)], fill=(55, 45, 75, 160), width=3)
        draw.line([(0, sy + 2), (W, sy + 2)], fill=(20, 15, 30, 200), width=2)
        
    # Grand Center Zodiac / Constellation Ring (The Atlas of Hollow Stars Altar)
    altar_cx, altar_cy = 1200, 960
    # Glowing concentric circles
    for r in [280, 276, 210, 150, 70]:
        draw.ellipse([altar_cx - r * 1.5, altar_cy - r * 0.45, altar_cx + r * 1.5, altar_cy + r * 0.45],
                     outline=(230, 185, 80, 210), width=3)
    # Radial constellation spokes
    for deg in range(0, 360, 30):
        rad = math.radians(deg)
        x_in = altar_cx + math.cos(rad) * 150 * 1.5
        y_in = altar_cy + math.sin(rad) * 150 * 0.45
        x_out = altar_cx + math.cos(rad) * 280 * 1.5
        y_out = altar_cy + math.sin(rad) * 280 * 0.45
        draw.line([(x_in, y_in), (x_out, y_out)], fill=(240, 200, 90, 180), width=2)
        # Star glyph points
        draw.ellipse([x_out - 4, y_out - 4, x_out + 4, y_out + 4], fill=(255, 235, 160, 240))
        
    # Left & Right Stone Braziers with Celestial Cyan/Gold Fire
    for bx in [260, 2140]:
        by = 890
        # Brazier stone pillar
        draw.polygon([(bx - 35, by + 120), (bx + 35, by + 120), (bx + 25, by + 20), (bx - 25, by + 20)],
                     fill=(45, 35, 60, 255), outline=(75, 60, 95, 240), width=3)
        # Brazier bowl
        draw.ellipse([bx - 55, by, bx + 55, by + 35], fill=(60, 48, 80, 255), outline=(100, 80, 130, 240), width=3)
        # Magical fire glow
        for fr in [45, 30, 18, 8]:
            fa = int(220 * (1 - fr / 50))
            draw.ellipse([bx - fr * 0.8, by - fr * 1.4, bx + fr * 0.8, by + 15],
                         fill=(80, 220, 255, fa))
        draw.ellipse([bx - 8, by - 25, bx + 8, by + 5], fill=(255, 255, 255, 240))
        
    img.save(os.path.join(OUT_DIR, "stage_ground.png"), "PNG")
    print("stage_ground.png saved.")

# -----------------------------------------------------------------------------
# 5. Foreground Framing (foreground.png)
# -----------------------------------------------------------------------------
def make_foreground():
    print("Generating foreground.png...")
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Dark framing silhouettes with depth of field blur
    # Left framing arch & shattered stone pillar
    draw.polygon([(0, 0), (320, 0), (280, 460), (140, 780), (0, 980)], fill=(12, 8, 20, 250))
    # Right framing arch
    draw.polygon([(W, 0), (W - 340, 0), (W - 290, 520), (W - 160, 840), (W, 1020)], fill=(12, 8, 20, 250))
    # Top archway keystone overhang
    top_arch = [(0, 0), (W, 0), (W, 110), (1600, 160), (1200, 90), (800, 160), (0, 110)]
    draw.polygon(top_arch, fill=(14, 10, 22, 250))
    
    # Hanging astral wisteria vines
    for vx, v_len in [(180, 380), (240, 460), (310, 320), (2060, 350), (2180, 480), (2280, 410)]:
        pts = [(vx, 100)]
        curr_y = 100
        while curr_y < v_len:
            curr_y += 35
            offset_x = math.sin(curr_y * 0.04) * 14
            pts.append((vx + offset_x, curr_y))
            # Hanging leaf/flower drops
            draw.ellipse([vx + offset_x - 6, curr_y - 6, vx + offset_x + 6, curr_y + 6], fill=(160, 120, 220, 220))
            draw.ellipse([vx + offset_x - 3, curr_y - 3, vx + offset_x + 3, curr_y + 3], fill=(220, 190, 255, 240))
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i+1]], fill=(30, 22, 44, 255), width=4)
            
    # Floating foreground crystal shards with slight DOF blur
    shards = [
        (120, 580, 60, 140, (140, 210, 255)),
        (220, 840, 45, 95, (230, 160, 255)),
        (2240, 640, 55, 130, (255, 210, 110)),
        (2120, 780, 40, 85, (120, 240, 240)),
    ]
    for sx, sy, sw, sh, scol in shards:
        poly = [(sx, sy - sh//2), (sx + sw//2, sy), (sx, sy + sh//2), (sx - sw//2, sy)]
        draw.polygon(poly, fill=(scol[0], scol[1], scol[2], 210), outline=(255, 255, 255, 230), width=2)
        draw.line([(sx, sy - sh//2 + 5), (sx, sy + sh//2 - 5)], fill=(255, 255, 255, 220), width=2)
        
    # Apply subtle Gaussian blur (radius=3) to simulate camera depth-of-field foreground bokeh
    img = img.filter(ImageFilter.GaussianBlur(3))
    img.save(os.path.join(OUT_DIR, "foreground.png"), "PNG")
    print("foreground.png saved.")

if __name__ == "__main__":
    make_sky()
    make_far_mountains()
    make_midground()
    make_stage_ground()
    make_foreground()
    print("All 5 background planes generated successfully!")
