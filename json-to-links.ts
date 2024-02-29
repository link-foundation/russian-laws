import { DeepClient, SerialOperation } from "@deep-foundation/deeplinks/imports/client.js";
import { createLinkOperation } from './create-link-operation.js';
import { createClauseOperation } from './create-clause-operation.js';
import { htmlToJson } from "./html-to-json.js";
import { Comment } from "./comment.js";
import { LawPage } from "./law-page.js";


export async function jsonToLinks({deep, json ,spaceId}: {deep: DeepClient; json: LawPage; spaceId: number }) {
    const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain');
    const commentTypeLinkId = await deep.id('@deep-foundation/law', 'Comment');
    const articleTypeLinkId = await deep.id('@deep-foundation/law', 'Article');
    const sectionTypeLinkId = await deep.id('@deep-foundation/law', 'Section');
    const chapterTypeLinkId = await deep.id('@deep-foundation/law', 'Chapter');
    const clauseTypeLinkId = await deep.id('@deep-foundation/law', 'Clause');

    console.log('containTypeLinkId', containTypeLinkId);
    console.log('commentTypeLinkId', commentTypeLinkId);
    console.log('articleTypeLinkId', articleTypeLinkId);
    console.log('sectionTypeLinkId', sectionTypeLinkId);
    console.log('chapterTypeLinkId', chapterTypeLinkId);
    console.log('clauseTypeLinkId', clauseTypeLinkId);

    let count = 0;
    json.sections.forEach(section => {
        count++; // для каждого раздела
        section.chapters.forEach(chapter => {
            count++; // для каждой главы
            chapter.articles.forEach(() => {
                count++; // для каждой статьи
            });
        });
    });

    const reservedIds = await deep.reserve(count);

    let operations: Array<SerialOperation> = [];
    const processComments = (comments: Array<Comment>, parentLinkId: number) => {
        comments?.forEach(comment => {
            operations.push({
                table: 'links',
                type: 'insert',
                objects: {
                    type_id: commentTypeLinkId,
                    in: {
                        data: parentLinkId ? [{
                            type_id: containTypeLinkId,
                            from_id: parentLinkId,
                            string: { data: { value: comment.text } },
                        }] : [],
                    },
                },
            });
        });
    };

    json.sections.forEach(section => {
        const sectionLinkId = reservedIds.pop();
        if (!sectionLinkId) {
            throw new Error('No reserved id');
        }
        operations.push(createLinkOperation({ linkId: sectionLinkId, type: sectionTypeLinkId, contain: containTypeLinkId, title: section.title, deep,parentId: spaceId }));
        processComments(section.comments, sectionLinkId);

        section.chapters.forEach(chapter => {
            const chapterLinkId = reservedIds.pop();
            if (!chapterLinkId) {
                throw new Error('No reserved id');
            }
            operations.push(createLinkOperation({ linkId: chapterLinkId, type: chapterTypeLinkId, contain: containTypeLinkId, title: chapter.title, deep, parentId: sectionLinkId }));
            processComments(chapter.comments, chapterLinkId);

            chapter.articles.forEach(article => {
                const articleLinkId = reservedIds.pop();
                if (!articleLinkId) {
                    throw new Error('No reserved id');
                }
                operations.push(createLinkOperation({ linkId: articleLinkId, type: articleTypeLinkId, contain: containTypeLinkId, title: article.title, deep, parentId: chapterLinkId }));
                processComments(article.comments, articleLinkId);

                article.clauses.forEach(clause => {
                    operations.push(createClauseOperation({ clause, articleLinkId, clauseTypeLinkId, containTypeLinkId }));
                });
            });
        });
    });

    const result = await deep.serial({ operations });
    return result;
}
