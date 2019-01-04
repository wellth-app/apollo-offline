import { compose } from "redux";
import { connect } from "react-redux";
import gql from "graphql-tag";
import { Query } from "apollo-boost";
import Component from "../../components/QueryResults";

const QUERY = gql`
  query YourQuery {
    allTodos {
      title
      id
      completed
    }
  }
`;

export default () => (
  <Query query={QUERY}>
    {({ loading, error, data }) => (
      <Component
        placeholder="Placeholder text..."
        loadingMessage="Loading..."
        loading={loading}
        data={data}
      />
    )}
  </Query>
);
