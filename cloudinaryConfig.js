// cloudinaryConfig.js (Apenas com informações públicas, a Secret fica no Backend)

const CLOUDINARY_CLOUD_NAME = 'dya1jd0mx';
const CLOUDINARY_UPLOAD_PRESET = 'videot_upload'; // Crie esta preset no painel do Cloudinary

// Função para fazer o upload de um arquivo
export const uploadVideoToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );
        const data = await response.json();
        return data; // Contém 'secure_url', 'public_id', etc.
    } catch (error) {
        console.error("Erro no upload para Cloudinary:", error);
        throw error;
    }
};
