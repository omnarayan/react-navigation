import {
  CommonActions,
  createNavigatorFactory,
  createScreenFactory,
  type DefaultNavigatorOptions,
  type DefaultRouterOptions,
  type EventMapBase,
  type NavigationAction,
  type NavigationState,
  type NavigatorTypeBagBase,
  type NavigatorTypeBagFor,
  type ParamListBase,
  type RouterFactory,
  useNavigationBuilder,
} from '@react-navigation/core';
import * as React from 'react';
import type {
  createStandardNavigator,
  NavigatorArgs as StandardNavigationArgs,
} from 'standard-navigation';

import { useBuildHref } from './useLinkBuilder';

type EventData<Event> = Event extends { data?: infer Data }
  ? Data extends object | undefined
    ? Data
    : object | undefined
  : undefined;

type EventCanPreventDefault<Event> = Event extends { canPreventDefault: true }
  ? true
  : false;

type StandardEventMap<EventMap extends EventMapBase> = {
  [EventName in keyof EventMap]: {
    data: EventData<EventMap[EventName]>;
    canPreventDefault: EventCanPreventDefault<EventMap[EventName]>;
  };
};

export type StandardNavigator<
  ScreenOptions extends {},
  EventMap extends EventMapBase,
  NavigatorProps extends object = {},
> = ReturnType<
  typeof createStandardNavigator<
    ScreenOptions,
    StandardEventMap<EventMap>,
    NavigatorProps
  >
>;

type StandardNavigationNavigatorProps<
  State extends NavigationState,
  RouterOptions extends DefaultRouterOptions,
  ScreenOptions extends {},
  EventMap extends EventMapBase,
  NavigatorProps extends object,
  Navigation,
> = DefaultNavigatorOptions<
  ParamListBase,
  State,
  ScreenOptions,
  EventMap,
  Navigation
> &
  RouterOptions &
  Omit<
    NavigatorProps,
    keyof StandardNavigationArgs<ScreenOptions, StandardEventMap<EventMap>>
  >;

export interface StandardNavigationTypeBagBase extends NavigatorTypeBagBase {
  ScreenOptions: {};
  EventMap: EventMapBase;
  NavigatorProps: {};
  RouterOptions: DefaultRouterOptions;
}

export function createStandardNavigationFactories<
  TypeBag extends StandardNavigationTypeBagBase,
>(
  standardNavigator: StandardNavigator<
    TypeBag['ScreenOptions'],
    TypeBag['EventMap'],
    TypeBag['NavigatorProps']
  >,
  router: RouterFactory<
    NavigatorTypeBagFor<TypeBag, ParamListBase>['State'],
    NavigationAction,
    TypeBag['RouterOptions']
  >
) {
  type Bag = NavigatorTypeBagFor<TypeBag, ParamListBase>;
  type State = Bag['State'];
  type RouterOptions = TypeBag['RouterOptions'];
  type ScreenOptions = TypeBag['ScreenOptions'];
  type EventMap = TypeBag['EventMap'];
  type NavigatorProps = TypeBag['NavigatorProps'];
  type ActionHelpers = Bag['ActionHelpers'];
  type Navigation = Bag['NavigationList'][keyof Bag['NavigationList']];
  type StandardArgs = StandardNavigationArgs<
    ScreenOptions,
    StandardEventMap<EventMap>
  >;

  function StandardNavigationNavigator(
    props: StandardNavigationNavigatorProps<
      State,
      RouterOptions,
      ScreenOptions,
      EventMap,
      NavigatorProps,
      Navigation
    >
  ) {
    const {
      initialRouteName,
      routeNamesChangeBehavior,
      children,
      layout,
      screenListeners,
      screenOptions,
      screenLayout,
      router: routerOverrides,
      ...rest
    } = props;

    // `rest` contains both router options and custom standard navigator props.
    // TypeScript can't split that intersection after destructuring, but
    // `useNavigationBuilder` needs the router options and ignores unrelated keys.
    const builderOptions = {
      initialRouteName,
      routeNamesChangeBehavior,
      children,
      layout,
      screenListeners,
      screenOptions,
      screenLayout,
      router: routerOverrides,
      ...rest,
    } as DefaultNavigatorOptions<
      ParamListBase,
      State,
      ScreenOptions,
      EventMap,
      Navigation
    > &
      RouterOptions;

    const { state, descriptors, navigation, NavigationContent } =
      useNavigationBuilder<
        State,
        RouterOptions,
        ActionHelpers extends Record<string, (...args: any) => void>
          ? ActionHelpers
          : {},
        ScreenOptions,
        EventMap
      >(router, builderOptions);

    const buildHref = useBuildHref();

    const standardState = React.useMemo(
      (): StandardArgs['state'] => ({
        index: state.index,
        routes: state.routes.map((route: State['routes'][number]) => ({
          key: route.key,
          name: route.name,
          params: route.params,
          href: buildHref(route.name, route.params),
        })),
      }),
      [buildHref, state.index, state.routes]
    );

    const standardDescriptors = React.useMemo(() => {
      const result: StandardArgs['descriptors'] = {};

      for (const route of state.routes) {
        const descriptor = descriptors[route.key];

        result[route.key] = {
          options: descriptor.options,
          render: descriptor.render,
        };
      }

      return result;
    }, [descriptors, state.routes]);

    const actions = React.useMemo<StandardArgs['actions']>(
      () => ({
        navigate(name: string, params?: object | undefined) {
          navigation.dispatch({
            ...CommonActions.navigate(name, params),
            target: state.key,
          });
        },
      }),
      [navigation, state.key]
    );

    // React Navigation's emitter and standard-navigation's emitter accept the
    // same event shape, but their generic return types are modeled separately.
    const emit = navigation.emit as StandardArgs['emitter']['emit'];

    // `rest` may also include router options. TypeScript can't separate those
    // from custom navigator props after destructuring a generic intersection.
    const standardNavigatorProps = rest as unknown as Omit<
      NavigatorProps,
      keyof StandardArgs
    >;

    return (
      <NavigationContent>
        {standardNavigator.render({
          ...standardNavigatorProps,
          state: standardState,
          descriptors: standardDescriptors,
          actions,
          emitter: {
            emit,
          },
        })}
      </NavigationContent>
    );
  }

  type StandardTypeBag = TypeBag & {
    Navigator: typeof StandardNavigationNavigator;
  };

  return {
    createNavigator: createNavigatorFactory<StandardTypeBag>(
      StandardNavigationNavigator
    ),
    createScreen: createScreenFactory<StandardTypeBag>(),
  };
}
