import { SemanticTag } from './semantic-tag';

export interface ISnomedConcept {
    conceptId: String;
    term: String;
    fsn: String;
    semanticTag: String;
    refsetIds: [String];
}

export let SnomedConcept = {
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: SemanticTag,
    refsetIds: [String]
};
