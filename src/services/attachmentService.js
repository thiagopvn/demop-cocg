import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import db, { storage } from '../firebase/db';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILES = 10;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

export function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido. Use imagens ou PDF.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }
  return { valid: true, error: null };
}

export function uploadAttachment(movimentacaoId, file, username) {
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `reparos/${movimentacaoId}/${timestamp}_${safeFileName}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  const promise = new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      null,
      (error) => reject(error),
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          const anexo = {
            id: `${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            storagePath,
            downloadURL,
            uploadedAt: new Date().toISOString(),
            uploadedBy: username,
          };

          const movRef = doc(db, 'movimentacoes', movimentacaoId);
          await updateDoc(movRef, {
            anexos: arrayUnion(anexo),
          });

          resolve(anexo);
        } catch (error) {
          reject(error);
        }
      }
    );
  });

  return { uploadTask, promise };
}

export async function deleteAttachment(movimentacaoId, anexo) {
  const storageRef = ref(storage, anexo.storagePath);
  await deleteObject(storageRef);

  const movRef = doc(db, 'movimentacoes', movimentacaoId);
  await updateDoc(movRef, {
    anexos: arrayRemove(anexo),
  });
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
