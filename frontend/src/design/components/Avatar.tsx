import { type ReactElement, useState, useSyncExternalStore } from 'react';
import { photoUrl, subscribeToPhotoRevisions } from '../../api/photos';
import type { PersonSummary } from '../../api/types';
import { classNames } from '../classNames';
import styles from './Avatar.module.scss';
import { initialsOf } from './initials';

export type AvatarPerson = Pick<PersonSummary, 'id' | 'given_names' | 'surname' | 'sex' | 'has_photo'>;

export type AvatarSize = 'small' | 'medium' | 'large' | 'huge';

export interface AvatarProps {
  person: AvatarPerson;
  size?: AvatarSize;
  alt?: string;
}

export function Avatar({ person, size = 'medium', alt = '' }: AvatarProps): ReactElement {
  const source = useSyncExternalStore(subscribeToPhotoRevisions, () => photoUrl(person.id));
  const [brokenSource, setBrokenSource] = useState<string | null>(null);
  const showsPhoto = person.has_photo && brokenSource !== source;
  function handlePhotoError(): void {
    setBrokenSource(source);
  }
  return (
    <span className={classNames(styles.avatar, styles[size], styles[person.sex])}>
      {showsPhoto ? (
        <img className={styles.photo} src={source} alt={alt} loading="lazy" decoding="async" onError={handlePhotoError} />
      ) : (
        <Initials person={person} alt={alt} />
      )}
    </span>
  );
}

function Initials({ person, alt }: { person: AvatarPerson; alt: string }): ReactElement {
  const initials = initialsOf(person);
  return alt === '' ? (
    <span aria-hidden="true">{initials}</span>
  ) : (
    <span role="img" aria-label={alt}>
      {initials}
    </span>
  );
}
