/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Driver } from "neo4j-driver";
import { graphql } from "graphql";
import { gql } from "apollo-server";
import { generate } from "randomstring";
import neo4j from "../neo4j";
import { Neo4jGraphQL } from "../../../src/classes";
import { generateUniqueType } from "../../utils/graphql-types";

describe("https://github.com/neo4j/graphql/issues/354", () => {
    let driver: Driver;

    beforeAll(async () => {
        driver = await neo4j();
    });

    afterAll(async () => {
        await driver.close();
    });

    test("should throw when creating a node without a mandatory relationship", async () => {
        const session = driver.session();

        const testComment = generateUniqueType("Comment");
        const testPost = generateUniqueType("Post");

        const typeDefs = gql`
            type ${testComment.name} {
                comment_id: ID!
                post: ${testPost.name}! @relationship(type: "HAS_POST", direction: OUT)
            }

            type ${testPost.name} {
                post_id: ID!
            }
        `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        const missingNodeId = generate({
            charset: "alphabetic",
        });

        const commentId = generate({
            charset: "alphabetic",
        });

        const query = `
            mutation {
                ${testComment.operations.create}(
                    input: [{
                        comment_id: "${commentId}",
                        post: {
                            connect: {
                                where: { node: { post_id: "${missingNodeId}" } }
                            }
                        }
                    }]
                ) {
                    ${testComment.plural} {
                        comment_id
                    }
                }
            }
        `;

        try {
            const result = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: { driver },
            });

            expect(result.errors).toBeTruthy();
            expect((result.errors as any[])[0].message).toBe(`${testComment.name}.post required`);
        } finally {
            await session.close();
        }
    });
});
