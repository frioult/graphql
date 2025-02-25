# Relationship Properties Create Cypher

Schema:

```graphql
type Movie {
    title: String!
    actors: [Actor!]!
        @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
}

type Actor {
    name: String!
    movies: [Movie!]!
        @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
}

interface ActedIn {
    screenTime: Int!
}
```

---

## Create movie with a relationship that has properties

### GraphQL Input

```graphql
mutation {
    createMovies(
        input: [
            {
                title: "Forrest Gump"
                actors: {
                    create: [
                        {
                            node: { name: "Tom Hanks" }
                            edge: { screenTime: 60 }
                        }
                    ]
                }
            }
        ]
    ) {
        movies {
            title
            actorsConnection {
                edges {
                    screenTime
                    node {
                        name
                    }
                }
            }
        }
    }
}
```

### Expected Cypher Output

```cypher
CALL {
  CREATE (this0:Movie)
  SET this0.title = $this0_title

    WITH this0
    CREATE (this0_actors0_node:Actor)
    SET this0_actors0_node.name = $this0_actors0_node_name
    MERGE (this0)<-[this0_actors0_relationship:ACTED_IN]-(this0_actors0_node)
    SET this0_actors0_relationship.screenTime = $this0_actors0_relationship_screenTime

  RETURN this0
}
CALL {
    WITH this0
    MATCH (this0)<-[this0_acted_in_relationship:ACTED_IN]-(this0_actor:Actor)
    WITH collect({ screenTime: this0_acted_in_relationship.screenTime, node: { name: this0_actor.name } }) AS edges
    RETURN { edges: edges, totalCount: size(edges) } AS actorsConnection
}

RETURN
this0 { .title, actorsConnection } AS this0
```

### Expected Cypher Params

```json
{
    "this0_title": "Forrest Gump",
    "this0_actors0_node_name": "Tom Hanks",
    "this0_actors0_relationship_screenTime": {
        "high": 0,
        "low": 60
    }
}
```

---
