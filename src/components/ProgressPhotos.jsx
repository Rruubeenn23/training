import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, ArrowLeftRight } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';

// Compress image using canvas — reduces base64 size by ~70%
function compressImage(dataUrl, maxDimension = 900, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original on error
    img.src = dataUrl;
  });
}

export default function ProgressPhotos({ onClose }) {
  const { progressPhotos: photos, addProgressPhoto, removeProgressPhoto } = useAppData();
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([null, null]);
  const [showUpload, setShowUpload] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [photoNotes, setPhotoNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const compressed = await compressImage(event.target.result);
      setPreviewImage(compressed);
      setShowUpload(true);
    };
    reader.readAsDataURL(file);
  };

  const savePhoto = async () => {
    if (!previewImage || saving) return;
    setSaving(true);

    const photo = {
      date: new Date().toISOString().split('T')[0],
      image: previewImage,
      notes: photoNotes
    };

    await addProgressPhoto(photo);
    setPreviewImage(null);
    setPhotoNotes('');
    setShowUpload(false);
    setSaving(false);
  };

  const deletePhoto = async (photoId) => {
    if (!confirm('¿Seguro que quieres eliminar esta foto?')) return;
    await removeProgressPhoto(photoId);
  };

  const togglePhotoSelection = (photo, index) => {
    if (selectedPhotos[0]?.id === photo.id) {
      setSelectedPhotos([null, selectedPhotos[1]]);
    } else if (selectedPhotos[1]?.id === photo.id) {
      setSelectedPhotos([selectedPhotos[0], null]);
    } else {
      if (!selectedPhotos[0]) {
        setSelectedPhotos([photo, selectedPhotos[1]]);
      } else if (!selectedPhotos[1]) {
        setSelectedPhotos([selectedPhotos[0], photo]);
      } else {
        // Replace oldest selection
        setSelectedPhotos([selectedPhotos[1], photo]);
      }
    }
  };

  if (showUpload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button 
          onClick={() => {
            setShowUpload(false);
            setPreviewImage(null);
            setPhotoNotes('');
          }} 
          className="mb-6 text-blue-400 hover:text-blue-300"
        >
          ← Cancelar
        </button>

        <h1 className="text-2xl font-bold mb-6">Nueva foto de progreso</h1>

        <div className="bg-slate-800 rounded-2xl p-4 mb-4">
          <img 
            src={previewImage} 
            alt="Preview" 
            className="w-full rounded-xl mb-4"
          />

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={photoNotes}
              onChange={(e) => setPhotoNotes(e.target.value)}
              placeholder="Ej: Después de 4 semanas, bajé 2kg, se nota más definición en abdomen..."
              className="w-full bg-slate-900 text-white rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            />
          </div>

          <button
            onClick={savePhoto}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-900 text-white font-semibold py-3 rounded-xl transition-all"
          >
            {saving ? 'Guardando...' : 'Guardar foto'}
          </button>
        </div>
      </div>
    );
  }

  if (compareMode && selectedPhotos[0] && selectedPhotos[1]) {
    const daysDiff = Math.round(
      (new Date(selectedPhotos[1].date) - new Date(selectedPhotos[0].date)) / (1000 * 60 * 60 * 24)
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <button 
          onClick={() => {
            setCompareMode(false);
            setSelectedPhotos([null, null]);
          }} 
          className="mb-6 text-blue-400 hover:text-blue-300"
        >
          ← Volver
        </button>

        <h1 className="text-2xl font-bold mb-2">Comparación</h1>
        <p className="text-gray-400 mb-6">
          {daysDiff} días de diferencia
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <img 
              src={selectedPhotos[0].image} 
              alt="Before" 
              className="w-full rounded-xl mb-2"
            />
            <p className="text-sm text-gray-400 text-center">
              {new Date(selectedPhotos[0].date).toLocaleDateString('es-ES')}
            </p>
            {selectedPhotos[0].notes && (
              <p className="text-xs text-gray-500 text-center mt-1">
                {selectedPhotos[0].notes}
              </p>
            )}
          </div>

          <div>
            <img 
              src={selectedPhotos[1].image} 
              alt="After" 
              className="w-full rounded-xl mb-2"
            />
            <p className="text-sm text-gray-400 text-center">
              {new Date(selectedPhotos[1].date).toLocaleDateString('es-ES')}
            </p>
            {selectedPhotos[1].notes && (
              <p className="text-xs text-gray-500 text-center mt-1">
                {selectedPhotos[1].notes}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-2">💪 Progreso en {daysDiff} días</p>
          <p className="text-gray-300">
            Compara las fotos prestando atención a:
          </p>
          <ul className="mt-2 space-y-1 text-gray-400 ml-4 list-disc">
            <li>Definición muscular</li>
            <li>Reducción de grasa</li>
            <li>Postura y composición</li>
            <li>Vascularización</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-24">
      <button onClick={onClose} className="mb-6 text-blue-400 hover:text-blue-300">
        ← Volver
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Camera className="w-8 h-8" />
          Fotos de progreso
        </h1>
        <p className="text-gray-400">Registra tu evolución visual</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <label className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
          <Camera className="w-5 h-5" />
          Nueva foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        <button
          onClick={() => setCompareMode(!compareMode)}
          disabled={photos.length < 2}
          className={`font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            photos.length >= 2
              ? 'bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white'
              : 'bg-slate-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          {compareMode ? 'Cancelar' : 'Comparar'}
        </button>
      </div>

      {compareMode && (
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-300">
            Selecciona 2 fotos para comparar
          </p>
          {selectedPhotos.filter(Boolean).length > 0 && (
            <p className="text-xs text-blue-400 mt-1">
              {selectedPhotos.filter(Boolean).length} de 2 seleccionadas
            </p>
          )}
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 mb-2">No hay fotos todavía</p>
          <p className="text-gray-500 text-sm">Sube tu primera foto de progreso</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {photos.map((photo, index) => {
            const isSelected = selectedPhotos[0]?.id === photo.id || selectedPhotos[1]?.id === photo.id;
            
            return (
              <div 
                key={photo.id}
                className={`relative group ${
                  compareMode ? 'cursor-pointer' : ''
                } ${
                  isSelected ? 'ring-4 ring-blue-500 rounded-xl' : ''
                }`}
                onClick={() => compareMode && togglePhotoSelection(photo, index)}
              >
                <img 
                  src={photo.image} 
                  alt={`Progress ${index + 1}`}
                  className="w-full aspect-[3/4] object-cover rounded-xl"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-semibold">
                      {new Date(photo.date).toLocaleDateString('es-ES')}
                    </p>
                    {photo.notes && (
                      <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                        {photo.notes}
                      </p>
                    )}
                  </div>

                  {!compareMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhoto(photo.id);
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isSelected && compareMode && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {selectedPhotos[0]?.id === photo.id ? '1' : '2'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 bg-purple-500/10 border border-purple-500/50 rounded-xl p-4 text-sm">
        <p className="font-semibold mb-2">📸 Consejos para mejores fotos:</p>
        <ul className="space-y-1 text-gray-300 ml-4 list-disc">
          <li>Misma hora del día (preferible en ayunas)</li>
          <li>Misma iluminación y lugar</li>
          <li>Misma pose (frontal, lateral, espalda)</li>
          <li>Semanal o quincenal para ver cambios</li>
        </ul>
      </div>
    </div>
  );
}
