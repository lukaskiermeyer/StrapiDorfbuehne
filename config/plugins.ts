module.exports = ({ env }) => ({


  upload: {
    config: {
      provider: 'cloudinary', // Wichtig: Ändern auf 'cloudinary'
      providerOptions: {
        cloud_name: env('CLOUDINARY_CLOUD_NAME'),
        api_key: env('CLOUDINARY_API_KEY'),
        api_secret: env('CLOUDINARY_API_SECRET'),
      },
      actionOptions: {
        upload: {},
        uploadStream: {}, // Konfiguriere hier bei Bedarf Ordner in Cloudinary etc.
        delete: {},
      },
    },
  },

  // ... andere eventuelle Plugin-Konfigurationen ...
});