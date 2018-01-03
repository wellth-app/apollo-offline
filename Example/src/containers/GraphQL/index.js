// @flow
import { compose, connect } from "redux";
import { graphql, gql } from "apollo-client";
import Component from "../../components/QueryResults";

const mapStateToProps = state => ({});
const mapDispatchToProps = dispatch => ({});
const mergeProps = (stateProps, dispatchProps, ownProps) => ({});

export default compose(
  graphql(gql`
    query YourQuery {
      
    }
  `),
  connect(mapStateToProps, mapDispatchToProps, mergeProps)
)(Component);
