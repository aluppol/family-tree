import { useEffect, useState } from 'react';
import './People.sass';
import { IPerson, personService } from '../Person/PersonService.ts';
import PeopleListComponent from '../../components/PeopleList/PeopleList.tsx';
import BtnComponent from '../../components/Btn/Btn.tsx';
import { useNavigate } from 'react-router-dom';

const PeoplePage = () => {
  const [people, setPeople] = useState<IPerson[]>([]);
  const navigate = useNavigate();

  const loadPeople = async () => {
    const people = await personService.getPeople();
    setPeople(people)
  };

  useEffect(() => {
    loadPeople();
  }, []);

  return (
    <div className="people-page">
      <BtnComponent text="Add Person" action={() => {navigate('person/new')}}/>
      <PeopleListComponent people={people} />
    </div>
  );
};

export default PeoplePage;
