import { type ReactElement, useState } from 'react';
import type { Person } from '../../api/types';
import { ConfirmDialog } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { fullName } from '../people/personName';
import { useRemovePhoto, useUploadPhoto } from './photoMutations';
import { PhotoView } from './PhotoView';
import { usePhotoPreparation } from './usePhotoPreparation';

export function PhotoPanel({ person }: { person: Person }): ReactElement {
  const { preparation, prepare, discard } = usePhotoPreparation();
  const uploadPhoto = useUploadPhoto();
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  function handleSave(): void {
    if (preparation.status === 'prepared' && !uploadPhoto.isPending) {
      uploadPhoto.mutate({ person, photo: preparation.preparedPhoto.photo }, { onSuccess: discard });
    }
  }
  function handleFileSelect(file: File): void {
    uploadPhoto.reset();
    prepare(file);
  }
  return (
    <>
      <PhotoView
        person={person}
        preparation={preparation}
        isSaving={uploadPhoto.isPending}
        saveError={uploadPhoto.error}
        onFileSelect={handleFileSelect}
        onSave={handleSave}
        onDiscard={discard}
        onRemove={() => { setIsConfirmingRemoval(true); }}
      />
      {isConfirmingRemoval && <RemovePhotoDialog person={person} onClose={() => { setIsConfirmingRemoval(false); }} />}
    </>
  );
}

function RemovePhotoDialog({ person, onClose }: { person: Person; onClose: () => void }): ReactElement {
  const t = useT();
  const removePhoto = useRemovePhoto();
  function handleConfirm(): void {
    removePhoto.mutate(person, { onSuccess: onClose });
  }
  return (
    <ConfirmDialog isOpen title={t('photos.removeTitle')} confirmLabel={t('photos.remove')} onConfirm={handleConfirm} onCancel={onClose} isPending={removePhoto.isPending} error={removePhoto.error}>
      <p>{t('photos.removalMessage', { name: fullName(t, person) })}</p>
    </ConfirmDialog>
  );
}
