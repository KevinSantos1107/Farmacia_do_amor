import { Cloudinary } from '@cloudinary/url-gen';

export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxxnqs4gf',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'image_uploads',
};

export const cld = new Cloudinary({
  cloud: {
    cloudName: cloudinaryConfig.cloudName,
  },
});
