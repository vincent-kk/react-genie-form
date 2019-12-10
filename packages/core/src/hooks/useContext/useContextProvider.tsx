import { useMemo, isValidElement } from 'react';
import { get } from 'lodash-es';
import Context from './Context';
import defaultFormTypes from '../../formTypes';
import defaultParseValue from '../../parseValue';

function useContextProvider(params: any) {
  const formProps = useFormProps(params);

  const errors = useErrors(params);

  const value = useMemo(() => ({ formProps, errors }), [formProps, errors]);

  return [Context.Provider, value] as any[];
}

export default useContextProvider;

function useErrors({ errors }: any): any {
  const serialized = useMemo(() => JSON.stringify(errors), [errors]);

  const errorsByDataPath = useMemo(
    () =>
      (errors || []).reduce(
        (accum: any, e: any) => ({
          ...accum,
          [e.dataPath]: [...(accum[e.dataPath] || []), e],
        }),
        {},
      ),
    [serialized],
  );

  return useMemo(() => ({ errors, dataPath: errorsByDataPath }), [
    errors,
    errorsByDataPath,
  ]);
}

function useFormProps({
  schema,
  form,
  formTypes,
  parseValue,
  plugin,
  FormGroup,
  Label,
  Description,
  ErrorMessage,
}: any) {
  const mergedForm = useMemo(() => {
    let merged = (form || ['*'])
      .map((name: any) =>
        typeof name === 'string'
          ? { name }
          : typeof name === 'object' && isValidElement(name)
          ? { name: '__reactElement', reactElement: name }
          : name,
      )
      .filter(
        (e: any, i: number, arr: any[]) =>
          e &&
          typeof e.name === 'string' &&
          (arr.findIndex(({ name }: any) => e.name === name) === i ||
            e.name.match(/^__/)),
      );
    const names = merged.map((e: any) => e.name);
    const rest = Object.keys(schema.properties || {}).filter(
      (e) => names.indexOf(e) === -1,
    );
    const dict = Object.entries(schema.properties || {}).reduce(
      (accum: any, [name, subSchema]: any) => ({
        ...accum,
        [name]: Object.entries(subSchema).reduce(
          (prev: any, [k, v]: any) =>
            k.match(/^ui:.*$/) ? { ...prev, [k.replace(/^ui:/, '')]: v } : prev,
          {},
        ),
      }),
      {},
    );
    return merged
      .reduce(
        (accum: any, e: any) =>
          e.name === '*'
            ? [...accum, ...rest.map((name: string) => ({ ...e, name }))]
            : [...accum, e],
        [],
      )
      .map((e: any) => ({ ...(dict[e.name] || {}), ...e }));
  }, [schema, form]);

  const mergedFormTypes = useMemo(
    () =>
      [
        ...(formTypes || []),
        ...get(plugin, ['formTypes'], []),
        ...defaultFormTypes,
      ]
        .map(({ component, test }) => {
          let testFn;
          if (typeof test === 'function') {
            testFn = test;
          } else if (typeof test === 'object') {
            testFn = (hint: Hint) =>
              Object.keys(test).reduce(
                (prev, key) =>
                  prev &&
                  ((Array.isArray(test[key]) &&
                    test[key].indexOf(hint[key]) === -1) ||
                    (!Array.isArray(test[key]) && test[key] !== hint[key]))
                    ? false
                    : prev,
                true,
              );
          }
          return { component, test: testFn };
        })
        .filter(({ test }) => test),
    [plugin, formTypes],
  );

  const mergedParseValue = useMemo(
    () => ({
      ...(parseValue || {}),
      ...get(formTypes, ['parseValue'], {}),
      ...defaultParseValue,
    }),
    [plugin, parseValue],
  );

  const formProps = useMemo(
    () => ({
      form: mergedForm,
      formTypes: mergedFormTypes,
      parseValue: mergedParseValue,
      FormGroup: FormGroup || get(plugin, ['FormGroup']),
      Label: Label || get(plugin, ['Label']),
      Description: Description || get(plugin, ['Description']),
      ErrorMessage: ErrorMessage || get(plugin, ['ErrorMessage']),
    }),
    [
      plugin,
      mergedForm,
      mergedFormTypes,
      mergedParseValue,
      FormGroup,
      Label,
      Description,
      ErrorMessage,
    ],
  );

  return formProps;
}
