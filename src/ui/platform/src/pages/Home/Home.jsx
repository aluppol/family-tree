import React, { useEffect, useState } from 'react';
import './Home.sass';
import { personService } from '../Person/PersonService';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [people, setPeople] = useState();

  const loadPeople = async () => {
    const people = await personService.getPeople();
    setPeople(people)
  };

  useEffect(() => {
    loadPeople();
  });
  return (
    <div className="home-page">
      <ul>
        {
          people?.map((person) => (
            <li key={person.id}>
              <Link to={`/person/${person.id}`}>{person.name} {person.familyName}</Link>
            </li>
          ))
        }
      </ul>
    </div>
  );
};

export default HomePage;
