from PIL import Image, ImageDraw
S = 560/1254.0
def p(x, y): return (x*S, y*S)
img = Image.new('RGB', (560,560), 'white')
d = ImageDraw.Draw(img)
legs = [
    [(470,760),(370,830),(400,1160)],
    [(460,665),(300,690),(100,955)],
    [(480,605),(370,580),(55,475)],
    [(490,560),(360,420),(410,52)],
]
d.ellipse([p(628,345)[0]-220*S, p(628,345)[1]-205*S, p(628,345)[0]+220*S, p(628,345)[1]+205*S], fill=(200,200,200), outline='black', width=3)
for L in legs:
    pts = [p(*q) for q in L]
    mpts = [(560-x, y) for x,y in pts]
    d.line(pts, fill='black', width=16, joint='curve')
    d.line(mpts, fill='black', width=16, joint='curve')
    for q in pts+mpts:
        d.ellipse([q[0]-9,q[1]-9,q[0]+9,q[1]+9], fill='black')
hx,hy = p(630,680)
d.ellipse([hx-172*S, hy-148*S, hx+172*S, hy+148*S], fill=(120,120,120), outline='black', width=3)
for ex in (545,712):
    ey = 880
    d.ellipse([p(ex,ey)[0]-74*S, p(ex,ey)[1]-70*S, p(ex,ey)[0]+74*S, p(ex,ey)[1]+70*S], fill=(60,60,60))
sx,sy = p(627,150)
d.ellipse([sx-8,sy-8,sx+8,sy+8], fill='red')
img.save('/home/user/spider/raw/spider_guide.png')
print('guide written')
