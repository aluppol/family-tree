import axios from 'axios'; 

class PersonService {
    baseUrl = 'http://0.0.0.0:3001';
    url = '/people';

    async getPerson(id: number) {
        if (!id) return null;
        try {
            const result = await axios.get(`${this.baseUrl}${this.url}/${id}`);
            return result.data;
        } catch (e) {
            console.error(`Error during loading person with id = ${id}: `, e);
            return null;
        }
        
    }

    async getPeople() {
        try {
            const result = await axios.get(`${this.baseUrl}${this.url}`);
            return result.data;
        } catch (e) {
            console.error('Error during loading people: ', e);
            return [];
        }
        
    }

    async updatePerson(id: number, payload: Partial<IPerson> = {}) {
        try {
            if (!id) throw new Error('You have to provide id in order to update person.');
            const {
                name,
                family_name,
                birthday,
                father_id,
                mother_id,
             } = payload;
            const result = await axios.put(`${this.baseUrl}${this.url}/${id}`, {
                name,
                family_name,
                birthday,
                father_id,
                mother_id,
            });

            return result.data;
        } catch(e) {
            console.error('Error during person update: ', e)
            return null;
        }
    }

    async createPerson(payload: IPerson) {
        if (!payload) return;
        try {
            const {
                name,
                family_name,
                birthday,
                father_id,
                mother_id,
             } = payload;
            const result = await axios.post(`${this.baseUrl}${this.url}`, {
                name,
                family_name,
                birthday,
                father_id,
                mother_id,
            });

            return result.data;
        } catch(e) {
            console.error('Error during person creation: ', e)
            return null;
        }
    }

    async deletePerson(id: number) {
        if (!id) throw new Error('You have to provide id in order to delete person.')
        return axios.delete(`${this.baseUrl}${this.url}/${id}`);
        
    }
}

export const personService = new PersonService();

export interface IPersonPayload {
    name: string;
    family_name: string;
    birthday: Date;

    father_id?: number;
    mother_id?: number;
}

export interface IPerson extends IPersonPayload {
    id: number;
    father?: IPerson;
    mother?: IPerson;
}