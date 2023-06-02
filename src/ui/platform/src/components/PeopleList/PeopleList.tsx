import { Link } from 'react-router-dom';
import './PeopleList.sass';
import { IPerson } from '../../pages/Person/PersonService';

const PeopleListComponent = ({ people }: { people: IPerson[] }) => {
  return (
    <div className="people-list-component">
      <ul>
        {
          people?.length ? people.map((person) => (
            <li key={person.id}>
              <Link to={`/person/${person.id}`}>{person.name} {person.family_name}</Link>
            </li>
          )) : (
            <h3>There is no people in the system.</h3>
          )
        }
      </ul>
    </div>
  );
};

export default PeopleListComponent;
