import * as React from "react";
import gql from "graphql-tag";
import { Query } from "react-apollo";
import Component from "../../components/QueryResults";

const QUERY = gql`
  query AllTodos {
    allTodos {
      title
      id
      nodeId
      completed
    }
  }
`;

export default () => (
  <Query query={QUERY} fetchPolicy={"no-cache"}>
    {(props) => {
      console.log("Props:", props);
      if (!!props.error) {
        console.log("Error:", props.error);
      }
      return (
        <Component
          placeholder="Placeholder text..."
          loadingMessage="Loading..."
          loading={props.loading}
          data={null}
        />
      );
    }}
  </Query>
);
