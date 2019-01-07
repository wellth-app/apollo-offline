const fs = require("fs");
const fetch = require("node-fetch");

const QUERY = `
{
  __schema {
    types {
      kind
      name
      possibleTypes {
        name
      }
    }
  }
}
`;

const downloadIntrospectionQuery = async ({
  uri,
  outputPath,
  filterMixedTypes = false,
}) => {
  const networkResult = await fetch(uri, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      variables: {},
      query: QUERY,
    }),
  });

  const result = await networkResult.json();

  if (filterMixedTypes) {
    result.data.__schema.types = result.data.__schema.types.filter(
      (type) => type.possibleTypes !== null,
    );
  }

  fs.writeFile(outputPath, JSON.stringify(result.data), (err) => {
    if (err) {
      console.error("Error writing fragmentTypes file", err);
    } else {
      console.log("Fragment types successfully extracted to", outputPath);
    }
  });
};

downloadIntrospectionQuery({
  uri: "https://fakerql.com/graphql",
  outputPath: "./src/config/fragmentTypes.json",
});
