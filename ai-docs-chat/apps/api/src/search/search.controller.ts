import { Controller, Post, Body } from '@nestjs/common';
import { SearchQueryDto, SearchResultDto } from '@ai-docs-chat/shared';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async search(@Body() body: SearchQueryDto): Promise<SearchResultDto[]> {
    return this.searchService.search(body.query, body.topK);
  }
}
