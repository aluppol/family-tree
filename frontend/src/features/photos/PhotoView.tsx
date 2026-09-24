import type { ReactElement } from 'react';
import type { Person } from '../../api/types';
import { Avatar, Button, Card, FileButton, Icon, InlineError } from '../../design/components';
import { fullName } from '../people/personName';
import styles from './Photo.module.scss';
import type { PhotoPreparation } from './usePhotoPreparation';

const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp';

export interface PhotoViewProps {
  person: Person;
  preparation: PhotoPreparation;
  isSaving: boolean;
  saveError: unknown;
  onFileSelect: (file: File) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRemove: () => void;
}

export function PhotoView(props: PhotoViewProps): ReactElement {
  const { person, preparation } = props;
  return (
    <Card className={styles.photoCard}>
      {preparation.status === 'prepared' ? (
        <img className={styles.preview} src={preparation.preparedPhoto.previewUrl} alt={`${fullName(person)} (unsaved preview)`} />
      ) : (
        <Avatar person={person} size="huge" alt={person.has_photo ? fullName(person) : ''} />
      )}
      <p className={styles.status} role="status">
        {preparation.status === 'preparing' ? 'Preparing photo…' : ''}
      </p>
      <InlineError error={preparation.status === 'failed' ? preparation.error : props.saveError} />
      {preparation.status === 'prepared' ? <PreviewActions {...props} /> : <PhotoActions {...props} />}
    </Card>
  );
}

function PreviewActions({ isSaving, onSave, onDiscard }: PhotoViewProps): ReactElement {
  return (
    <div className={styles.actions}>
      <Button variant="primary" onClick={onSave} aria-disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save photo'}
      </Button>
      <Button onClick={onDiscard}>Cancel</Button>
    </div>
  );
}

function PhotoActions({ person, preparation, onFileSelect, onRemove }: PhotoViewProps): ReactElement {
  return (
    <div className={styles.actions}>
      <FileButton
        label={person.has_photo ? 'Replace photo' : 'Upload photo'}
        accept={ACCEPTED_PHOTO_TYPES}
        onFileSelect={onFileSelect}
        disabled={preparation.status === 'preparing'}
        icon={<Icon name="photo" />}
        size="small"
      />
      {person.has_photo && (
        <Button variant="ghost" size="small" onClick={onRemove}>
          Remove photo
        </Button>
      )}
    </div>
  );
}
