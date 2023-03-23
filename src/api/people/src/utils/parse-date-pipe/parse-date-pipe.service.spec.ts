import { Test, TestingModule } from '@nestjs/testing';
import { ParseDatePipeService } from './parse-date-pipe.service';

describe('ParseDatePipeService', () => {
  let service: ParseDatePipeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParseDatePipeService],
    }).compile();

    service = module.get<ParseDatePipeService>(ParseDatePipeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
