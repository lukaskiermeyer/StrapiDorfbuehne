module.exports = ({ env }) => ({


  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_CLOUD_NAME'),
        api_key: env('CLOUDINARY_API_KEY'),
        api_secret: env('CLOUDINARY_API_SECRET'),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
      // Leere Breakpoints verhindern, dass Strapi versucht,
      // Large/Medium/Small Varianten im RAM zu berechnen.
      breakpoints: {},
      // Optional: Optimierung deaktivieren (spart CPU/RAM)
      sizeOptimization: true,
      autoOrientation: true,
    },
  },
});