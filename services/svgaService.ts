
import { SVGAMovieEntity } from '../types';

const getProtobuf = () => (window as any).protobuf;
const getPako = () => (window as any).pako;
const getJSZip = () => (window as any).JSZip;

let movieEntity: any;

export const initProtobuf = async () => {
  const protobuf = getProtobuf();
  if (!protobuf) throw new Error("Protobuf not found");
  if (movieEntity) return movieEntity;
  
  const root = new protobuf.Root();
  
  const MovieParams = new protobuf.Type("MovieParams")
    .add(new protobuf.Field("viewBoxWidth", 1, "float"))
    .add(new protobuf.Field("viewBoxHeight", 2, "float"))
    .add(new protobuf.Field("fps", 3, "int32"))
    .add(new protobuf.Field("frames", 4, "int32"));

  const Transform = new protobuf.Type("Transform")
    .add(new protobuf.Field("a", 1, "float")).add(new protobuf.Field("b", 2, "float"))
    .add(new protobuf.Field("c", 3, "float")).add(new protobuf.Field("d", 4, "float"))
    .add(new protobuf.Field("tx", 5, "float")).add(new protobuf.Field("ty", 6, "float"));

  const Layout = new protobuf.Type("Layout")
    .add(new protobuf.Field("x", 1, "float")).add(new protobuf.Field("y", 2, "float"))
    .add(new protobuf.Field("width", 3, "float")).add(new protobuf.Field("height", 4, "float"));

  const FrameEntity = new protobuf.Type("FrameEntity")
    .add(new protobuf.Field("alpha", 1, "float"))
    .add(new protobuf.Field("layout", 2, "Layout"))
    .add(new protobuf.Field("transform", 3, "Transform"))
    .add(new protobuf.Field("clipPath", 4, "string"));

  const ShapeEntity = new protobuf.Type("ShapeEntity")
    .add(new protobuf.Field("type", 1, "int32"))
    .add(new protobuf.Field("transform", 2, "Transform"))
    .add(new protobuf.Field("styles", 3, "bytes"))
    .add(new protobuf.Field("path", 4, "bytes"))
    .add(new protobuf.Field("ellipse", 5, "bytes"))
    .add(new protobuf.Field("rect", 6, "bytes"));

  const SpriteEntity = new protobuf.Type("SpriteEntity")
    .add(new protobuf.Field("imageKey", 1, "string"))
    .add(new protobuf.Field("frames", 2, "FrameEntity", "repeated"))
    .add(new protobuf.Field("matteKey", 3, "string"))
    .add(new protobuf.Field("shapes", 4, "ShapeEntity", "repeated"));

  movieEntity = new protobuf.Type("MovieEntity")
    .add(new protobuf.Field("version", 1, "string"))
    .add(new protobuf.Field("params", 2, "MovieParams"))
    .add(new protobuf.MapField("images", 3, "string", "bytes"))
    .add(new protobuf.Field("sprites", 4, "SpriteEntity", "repeated"))
    .add(new protobuf.MapField("audios", 5, "string", "bytes"));

  root.add(movieEntity).add(SpriteEntity).add(FrameEntity).add(Layout).add(Transform).add(MovieParams).add(ShapeEntity);
  return movieEntity;
};

export const decodeSVGA = async (buffer: ArrayBuffer): Promise<SVGAMovieEntity> => {
  const pako = getPako();
  const jszip = getJSZip();
  const uint8 = new Uint8Array(buffer);
  
  let inflated: Uint8Array;
  if (uint8[0] === 0x50 && uint8[1] === 0x4B) {
    const zip = await jszip.loadAsync(buffer);
    const movieFile = zip.file("movie.binary") || zip.file("movie.spec");
    if (!movieFile) throw new Error("Invalid SVGA: movie file not found");
    inflated = await movieFile.async("uint8array");
  } else {
    try {
      inflated = pako.inflate(uint8);
    } catch (e) {
      inflated = uint8;
    }
  }

  const entity = await initProtobuf();
  const decoded = entity.decode(inflated);
  const images: Record<string, Uint8Array> = {};
  for (const key in decoded.images) {
    images[key] = new Uint8Array(decoded.images[key]);
  }
  const audios: Record<string, Uint8Array> = {};
  if (decoded.audios) {
    for (const key in decoded.audios) {
      audios[key] = new Uint8Array(decoded.audios[key]);
    }
  }
  return { ...decoded, images, audios } as SVGAMovieEntity;
};

export const encodeSVGA = async (data: any): Promise<Blob> => {
  const pako = getPako();
  const entity = await initProtobuf();
  const message = entity.create(data);
  const buffer = entity.encode(message).finish();
  const deflated = pako.deflate(buffer, { level: 9 });
  return new Blob([deflated], { type: 'application/octet-stream' });
};

export const finalizeSVGAForExport = (data: SVGAMovieEntity): SVGAMovieEntity => {
  return JSON.parse(JSON.stringify(data));
};

export const compressSVGAActual = async (
  original: SVGAMovieEntity, 
  targetFrames: number, 
  imageQuality: number, 
  imageScale: number,
  stripShapes: boolean,
  stripAudios: boolean,
  precision: number, 
  onProgress: (p: number) => void
): Promise<Blob> => {
  const originalFrames = original.params.frames || 1;
  const target = Math.min(targetFrames, originalFrames);
  const skipRatio = originalFrames / target;

  const usedImages = new Set<string>();
  const processedSprites = original.sprites.map((sprite) => {
    const newFrames = [];
    for (let i = 0; i < target; i++) {
      const sourceIdx = Math.floor(i * skipRatio);
      const frame = sprite.frames[sourceIdx];
      if (frame) {
        const round = (v: number) => precision === 0 ? Math.round(v) : parseFloat(v.toFixed(precision));
        
        newFrames.push({
          alpha: round(frame.alpha || 0),
          layout: frame.layout ? {
            x: round(frame.layout.x || 0),
            y: round(frame.layout.y || 0),
            width: round(frame.layout.width || 0),
            height: round(frame.layout.height || 0)
          } : null,
          transform: frame.transform ? {
            a: round(frame.transform.a || 1),
            b: round(frame.transform.b || 0),
            c: round(frame.transform.c || 0),
            d: round(frame.transform.d || 1),
            tx: round(frame.transform.tx || 0),
            ty: round(frame.transform.ty || 0)
          } : null,
          clipPath: frame.clipPath
        });
        if (frame.alpha > 0.001) usedImages.add(sprite.imageKey);
      }
    }
    return { 
      imageKey: sprite.imageKey,
      frames: newFrames,
      matteKey: sprite.matteKey,
      shapes: stripShapes ? [] : sprite.shapes 
    };
  });

  const processedImages: Record<string, Uint8Array> = {};
  const imageKeys = Object.keys(original.images);
  
  for (let i = 0; i < imageKeys.length; i++) {
    const key = imageKeys[i];
    if (usedImages.has(key)) {
      processedImages[key] = await resizeImageBinary(original.images[key], imageQuality, imageScale);
    }
    onProgress(Math.round(((i + 1) / imageKeys.length) * 100));
  }

  const finalData = {
    version: "2.0",
    params: {
      ...original.params,
      frames: target,
      fps: original.params.fps
    },
    images: processedImages,
    sprites: processedSprites,
    audios: stripAudios ? {} : (original.audios || {})
  };

  return await encodeSVGA(finalData);
};

export const resizeImageBinary = async (imageBytes: Uint8Array, quality: number, scale: number): Promise<Uint8Array> => {
  if (scale === 1.0 && quality === 100) return imageBytes;
  return new Promise((resolve) => {
    const blob = new Blob([imageBytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor((img.width || 1) * scale));
      canvas.height = Math.max(1, Math.floor((img.height || 1) * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(imageBytes);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((resultBlob) => {
        if (!resultBlob) return resolve(imageBytes);
        const reader = new FileReader();
        reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.readAsArrayBuffer(resultBlob);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(imageBytes);
    };
    img.src = url;
  });
};
