import { type ReactElement, useState } from 'react';
import type { Person } from '../../api/types';
import { ConfirmDialog } from '../../design/components';
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
  const removePhoto = useRemovePhoto();
  function handleConfirm(): void {
    removePhoto.mutate(person, { onSuccess: onClose });
  }
  return (
    <ConfirmDialog isOpen title="Remove photo?" confirmLabel="Remove photo" onConfirm={handleConfirm} onCancel={onClose} isPending={removePhoto.isPending} error={removePhoto.error}>
      <p>The photo of {fullName(person)} will be deleted.</p>
    </ConfirmDialog>
  );
}
