import { useEffect, useState } from 'react';
import './People.sass';
import { IPerson, personService } from '../Person/PersonService.ts';
import PeopleListComponent from '../../components/PeopleList/PeopleList.tsx';

const PeoplePage = () => {
  const [people, setPeople] = useState<IPerson[]>([]);

  const loadPeople = async () => {
    const people = await personService.getPeople();
    setPeople(people)
  };

  useEffect(() => {
    loadPeople();
  }, []);

  return (
    <div className="people-page">
      <PeopleListComponent people={people} />
    </div>
  );
};

export default PeoplePage;
