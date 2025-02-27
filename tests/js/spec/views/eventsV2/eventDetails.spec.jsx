import {mountWithTheme} from 'sentry-test/enzyme';
import {initializeOrg} from 'sentry-test/initializeOrg';
import {act} from 'sentry-test/reactTestingLibrary';

import ProjectsStore from 'sentry/stores/projectsStore';
import EventView from 'sentry/utils/discover/eventView';
import {ALL_VIEWS, DEFAULT_EVENT_VIEW} from 'sentry/views/eventsV2/data';
import EventDetails from 'sentry/views/eventsV2/eventDetails';
import {OrganizationContext} from 'sentry/views/organizationContext';

const WrappedEventDetails = ({organization, ...rest}) => {
  return (
    <OrganizationContext.Provider value={organization}>
      <EventDetails organization={organization} {...rest} />
    </OrganizationContext.Provider>
  );
};

describe('EventsV2 > EventDetails', function () {
  const allEventsView = EventView.fromSavedQuery(DEFAULT_EVENT_VIEW);
  const errorsView = EventView.fromSavedQuery(
    ALL_VIEWS.find(view => view.name === 'Errors by Title')
  );

  beforeEach(function () {
    act(() => ProjectsStore.loadInitialData([TestStubs.Project()]));

    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/projects/',
      body: [],
    });

    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/discover/',
      body: {
        meta: {
          id: 'string',
          title: 'string',
          'project.name': 'string',
          timestamp: 'date',
        },
        data: [
          {
            id: 'deadbeef',
            title: 'Oh no something bad',
            'project.name': 'project-slug',
            timestamp: '2019-05-23T22:12:48+00:00',
          },
        ],
      },
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events/project-slug:deadbeef/',
      method: 'GET',
      body: {
        id: '1234',
        size: 1200,
        projectSlug: 'project-slug',
        eventID: 'deadbeef',
        groupID: '123',
        title: 'Oh no something bad',
        location: '/users/login',
        message: 'It was not good',
        dateCreated: '2019-05-23T22:12:48+00:00',
        entries: [
          {
            type: 'message',
            message: 'bad stuff',
            data: {},
          },
        ],
        tags: [
          {key: 'browser', value: 'Firefox'},
          {key: 'device.uuid', value: 'test-uuid'},
          {key: 'release', value: '82ebf297206a'},
        ],
      },
    });
    MockApiClient.addMockResponse({
      url: '/issues/123/',
      method: 'GET',
      body: TestStubs.Group({id: '123'}),
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-stats/',
      method: 'GET',
      body: {
        data: [
          [1234561700, [1]],
          [1234561800, [1]],
        ],
      },
    });
    MockApiClient.addMockResponse({
      url: '/projects/org-slug/project-slug/events/1234/committers/',
      method: 'GET',
      statusCode: 404,
      body: {},
    });
    MockApiClient.addMockResponse({
      url: '/projects/org-slug/project-slug/events/1234/grouping-info/',
      body: {},
    });

    // Missing event
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events/project-slug:abad1/',
      method: 'GET',
      statusCode: 404,
      body: {},
    });
  });

  it('renders', function () {
    const wrapper = mountWithTheme(
      <WrappedEventDetails
        organization={TestStubs.Organization()}
        params={{eventSlug: 'project-slug:deadbeef'}}
        location={{query: allEventsView.generateQueryStringObject()}}
      />,
      TestStubs.routerContext()
    );
    const content = wrapper.find('EventHeader');
    expect(content.text()).toContain('Oh no something bad');
  });

  it('renders a 404', function () {
    const wrapper = mountWithTheme(
      <WrappedEventDetails
        organization={TestStubs.Organization()}
        params={{eventSlug: 'project-slug:abad1'}}
        location={{query: allEventsView.generateQueryStringObject()}}
      />,
      TestStubs.routerContext()
    );
    const content = wrapper.find('NotFound');
    expect(content).toHaveLength(1);
  });

  it('renders a chart in grouped view', async function () {
    const wrapper = mountWithTheme(
      <WrappedEventDetails
        organization={TestStubs.Organization()}
        params={{eventSlug: 'project-slug:deadbeef'}}
        location={{query: errorsView.generateQueryStringObject()}}
      />,
      TestStubs.routerContext()
    );

    // loading state
    await tick();
    await wrapper.update();

    const content = wrapper.find('EventHeader');
    expect(content.text()).toContain('Oh no something bad');
  });

  it('renders an alert when linked issues are missing', function () {
    MockApiClient.addMockResponse({
      url: '/issues/123/',
      statusCode: 404,
      method: 'GET',
      body: {},
    });
    const wrapper = mountWithTheme(
      <WrappedEventDetails
        organization={TestStubs.Organization()}
        params={{eventSlug: 'project-slug:deadbeef'}}
        location={{query: allEventsView.generateQueryStringObject()}}
      />,
      TestStubs.routerContext()
    );
    const alert = wrapper.find('Alert');
    expect(alert).toHaveLength(1);
    expect(alert.text()).toContain('linked issue cannot be found');
  });

  it('navigates when tag values are clicked', async function () {
    const {organization, routerContext} = initializeOrg({
      organization: TestStubs.Organization(),
      router: {
        location: {
          pathname: '/organizations/org-slug/discover/project-slug:deadbeef',
          query: {},
        },
      },
    });
    const wrapper = mountWithTheme(
      <WrappedEventDetails
        organization={organization}
        params={{eventSlug: 'project-slug:deadbeef'}}
        location={{query: allEventsView.generateQueryStringObject()}}
      />,
      routerContext
    );
    await tick();
    await wrapper.update();

    // Get the first link as we wrap react-router's link
    const browserTagLink = wrapper
      .find('WrappedEventDetails KeyValueTable Value Link')
      .first();

    // Should append tag value and other event attributes to results view query.
    const browserTagTarget = browserTagLink.props().to;
    expect(browserTagTarget.pathname).toEqual(
      '/organizations/org-slug/discover/results/'
    );
    expect(browserTagTarget.query.query).toEqual(
      'browser:Firefox title:"Oh no something bad"'
    );

    // Get the second link
    const deviceUUIDTagLink = wrapper
      .find('WrappedEventDetails KeyValueTable Value Link')
      .at(2);

    // Should append tag value wrapped with tags[] as device.uuid is part of our fields
    const deviceUUIDTagTarget = deviceUUIDTagLink.props().to;
    expect(deviceUUIDTagTarget.pathname).toEqual(
      '/organizations/org-slug/discover/results/'
    );
    expect(deviceUUIDTagTarget.query.query).toEqual(
      'tags[device.uuid]:test-uuid title:"Oh no something bad"'
    );

    // Get the third link
    const releaseTagLink = wrapper
      .find('WrappedEventDetails KeyValueTable Value Link')
      .at(4);

    // Should append raw tag value without tags[] as release is exempt from being wrapped
    const releaseTagTarget = releaseTagLink.props().to;
    expect(releaseTagTarget.pathname).toEqual(
      '/organizations/org-slug/discover/results/'
    );
    expect(releaseTagTarget.query.query).toEqual(
      'release:82ebf297206a title:"Oh no something bad"'
    );
  });

  it('appends tag value to existing query when clicked', async function () {
    const {organization, routerContext} = initializeOrg({
      organization: TestStubs.Organization(),
      router: {
        location: {
          pathname: '/organizations/org-slug/discover/project-slug:deadbeef',
          query: {},
        },
      },
    });
    const wrapper = mountWithTheme(
      <WrappedEventDetails
        organization={organization}
        params={{eventSlug: 'project-slug:deadbeef'}}
        location={{
          query: {...allEventsView.generateQueryStringObject(), query: 'Dumpster'},
        }}
      />,
      routerContext
    );
    await tick();
    await wrapper.update();

    // Get the first link as we wrap react-router's link
    const browserTagLink = wrapper
      .find('WrappedEventDetails KeyValueTable Value Link')
      .first();

    // Should append tag value and other event attributes to results view query.
    const browserTagTarget = browserTagLink.props().to;
    expect(browserTagTarget.pathname).toEqual(
      '/organizations/org-slug/discover/results/'
    );
    expect(browserTagTarget.query.query).toEqual(
      'Dumpster browser:Firefox title:"Oh no something bad"'
    );

    // Get the second link
    const deviceUUIDTagLink = wrapper
      .find('WrappedEventDetails KeyValueTable Value Link')
      .at(2);

    // Should append tag value wrapped with tags[] as device.uuid is part of our fields
    const deviceUUIDTagTarget = deviceUUIDTagLink.props().to;
    expect(deviceUUIDTagTarget.pathname).toEqual(
      '/organizations/org-slug/discover/results/'
    );
    expect(deviceUUIDTagTarget.query.query).toEqual(
      'Dumpster tags[device.uuid]:test-uuid title:"Oh no something bad"'
    );

    // Get the third link
    const releaseTagLink = wrapper
      .find('WrappedEventDetails KeyValueTable Value Link')
      .at(4);

    // Should append raw tag value without tags[] as release is exempt from being wrapped
    const releaseTagTarget = releaseTagLink.props().to;
    expect(releaseTagTarget.pathname).toEqual(
      '/organizations/org-slug/discover/results/'
    );
    expect(releaseTagTarget.query.query).toEqual(
      'Dumpster release:82ebf297206a title:"Oh no something bad"'
    );
  });
});
