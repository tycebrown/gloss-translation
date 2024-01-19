import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LanguageRole, TextDirection } from '@translation/api-types';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLoaderData, useParams } from 'react-router-dom';
import apiClient from '../../shared/apiClient';
import bibleTranslationClient, {
  BibleTranslation,
} from '../../shared/bibleTranslationClient';
import { Icon } from '../../shared/components/Icon';
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
  ListRowAction,
} from '../../shared/components/List';
import View from '../../shared/components/View';
import ViewTitle from '../../shared/components/ViewTitle';
import Button from '../../shared/components/actions/Button';
import { Link } from '../../shared/components/actions/Link';
import {
  ButtonSelectorInput,
  ButtonSelectorOption,
} from '../../shared/components/form/ButtonSelectorInput';
import ComboboxInput from '../../shared/components/form/ComboboxInput';
import Form from '../../shared/components/form/Form';
import FormLabel from '../../shared/components/form/FormLabel';
import InputError from '../../shared/components/form/InputError';
import MultiselectInput from '../../shared/components/form/MultiselectInput';
import SortableMultiselectInput from '../../shared/components/form/SortableMultiselectInput';
import SubmittingIndicator from '../../shared/components/form/SubmittingIndicator';
import TextInput from '../../shared/components/form/TextInput';
import fontClient from '../../shared/fontClient';
import { useFlash } from '../../shared/hooks/flash';
import queryClient from '../../shared/queryClient';

const languageQueryKey = (code: string) => ({
  queryKey: ['language', code],
  queryFn: () => apiClient.languages.findByCode(code),
});
const languageMembersQueryKey = (code: string) => ({
  queryKey: ['language-members', code],
  queryFn: () => apiClient.languages.findMembers(code),
});

export const manageLanguageViewLoader = async (code: string) => {
  const language = await queryClient.ensureQueryData(languageQueryKey(code));
  const members = await queryClient.ensureQueryData(
    languageMembersQueryKey(code)
  );
  const fonts = await fontClient.getFonts();
  const translations = await bibleTranslationClient.getOptions(code);
  return { language, members, fonts, translations };
};

function useUpdateLanguageMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      userId: string;
      code: string;
      roles: LanguageRole[];
    }) =>
      apiClient.languages.updateMember(
        variables.code,
        variables.userId,
        variables.roles
      ),
    onSettled: (_, __, { code }, context) => {
      queryClient.invalidateQueries({
        queryKey: languageMembersQueryKey(code).queryKey,
      });
    },
  });
}

function useRemoveLanguageMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { userId: string; code: string }) =>
      apiClient.languages.removeMember(variables.code, variables.userId),
    onSettled: (_, __, { code }, context) => {
      queryClient.invalidateQueries({
        queryKey: languageMembersQueryKey(code).queryKey,
      });
    },
  });
}

function useLanguageQuery(code: string) {
  const loaderData = useLoaderData() as Awaited<
    ReturnType<typeof manageLanguageViewLoader>
  >;
  return useQuery({
    ...languageQueryKey(code),
    initialData: loaderData.language,
  });
}

function useLanguageMembersQuery(code: string) {
  const loaderData = useLoaderData() as Awaited<
    ReturnType<typeof manageLanguageViewLoader>
  >;
  return useQuery({
    ...languageMembersQueryKey(code),
    initialData: loaderData.members,
  });
}

interface FormData {
  name: string;
  font: string;
  textDirection: TextDirection;
  bibleTranslationIds: string[];
}

export default function ManageLanguageView() {
  const params = useParams() as { code: string };
  const flash = useFlash();

  const { data: language } = useLanguageQuery(params.code);
  // const { data: members } = useLanguageMembersQuery(params.code);
  const { fonts, translations } = useLoaderData() as {
    fonts: string[];
    translations: BibleTranslation[];
  };
  const translationOptions = translations.map(({ id, name }) => ({
    label: name,
    value: id,
  }));

  const { t } = useTranslation(['common', 'languages', 'users']);

  const removeMemberMutation = useRemoveLanguageMemberMutation();
  const updateMemberMutation = useUpdateLanguageMemberMutation();

  const formContext = useForm<FormData>();
  async function onSubmit(data: FormData) {
    console.log(JSON.stringify(data));
    return;
    try {
      await apiClient.languages.update(language.data.code, {
        name: data.name,
        font: data.font,
        textDirection: data.textDirection,
        bibleTranslationIds: data.bibleTranslationIds,
      });
      flash.success(t('languages:language_updated'));
    } catch (error) {
      flash.error(`${error}`);
    }
  }

  const [previewFont, setPreviewFont] = useState(language.data.font);
  const [members, setMembers] = useState([
    {
      email: 'anemail@gmail.com',
      name: 'No Idea',
      roles: [LanguageRole.Admin],
      userId: '018D1F11-70FF-D94F-2B0E-D58234320FC3',
    },
    {
      email: 'anotheremail@gmail.com',
      name: 'Who Knew',
      roles: [LanguageRole.Translator],
      userId: '018D1F11-70FF-D94F-2B0E-D57234320FC3',
    },
  ]);

  return (
    <View fitToScreen className="flex items-start justify-center">
      <div className="flex-shrink mx-4">
        <ViewTitle className="flex">
          <span>{language.data.name}</span>
          <span className="mx-2">-</span>
          <span>{language.data.code}</span>
        </ViewTitle>
        <Form context={formContext} onSubmit={onSubmit} className="mb-8">
          <div className="mb-2">
            <FormLabel htmlFor="name">
              {t('common:name').toUpperCase()}
            </FormLabel>
            <TextInput
              id="name"
              className="w-full"
              autoComplete="off"
              defaultValue={language.data.name}
              aria-describedby="name-error"
              hasErrors={!!formContext.formState.errors.name}
              {...formContext.register('name', { required: true })}
            />
            <InputError
              id="name-error"
              name="name"
              messages={{ required: t('languages:language_name_required') }}
            />
          </div>
          <div className="mb-2">
            <FormLabel htmlFor="font">
              {t('languages:font').toUpperCase()}
            </FormLabel>
            <Controller
              control={formContext.control}
              name="font"
              defaultValue={previewFont}
              rules={{ required: true }}
              render={({ field, fieldState }) => (
                <ComboboxInput
                  id="font"
                  className="w-full h-10"
                  items={fonts.map((font) => ({ label: font, value: font }))}
                  hasErrors={!!fieldState.error}
                  {...field}
                  onChange={(font) => {
                    field.onChange(font);
                    setPreviewFont(font);
                  }}
                />
              )}
            />
          </div>
          <div className="mb-2">
            <FormLabel id="text-direction-label">
              {t('languages:text_direction').toUpperCase()}
            </FormLabel>
            <div>
              <ButtonSelectorInput
                aria-labelledby="text-direction-label"
                defaultValue={language.data.textDirection}
              >
                <ButtonSelectorOption
                  value={TextDirection.LTR}
                  {...formContext.register('textDirection')}
                >
                  {t('languages:ltr')}
                </ButtonSelectorOption>
                <ButtonSelectorOption
                  value={TextDirection.RTL}
                  {...formContext.register('textDirection')}
                >
                  {t('languages:rtl')}
                </ButtonSelectorOption>
              </ButtonSelectorInput>
            </div>
          </div>
          <div className="mb-2">
            <FormLabel htmlFor="bibleTranslationIds">
              {t('languages:bible_translations').toUpperCase()}
            </FormLabel>
            <Controller
              control={formContext.control}
              name="bibleTranslationIds"
              defaultValue={language.data.bibleTranslationIds}
              render={({ field, fieldState }) => (
                <SortableMultiselectInput
                  {...field}
                  hasErrors={!!fieldState.error}
                  className="w-full"
                  items={translationOptions}
                  placeholder={t('languages:select_translations').toString()}
                />
              )}
            />
          </div>
          <div>
            <Button type="submit">{t('common:update')}</Button>
            <SubmittingIndicator className="ms-3" />
          </div>
        </Form>
        <List className="mb-8">
          <ListHeader>
            <ListHeaderCell className="min-w-[120px]">
              {t('common:name').toUpperCase()}
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              {t('users:email').toUpperCase()}
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              {t('users:roles').toUpperCase()}
            </ListHeaderCell>
            <ListHeaderCell />
          </ListHeader>
          <ListRowAction colSpan={4}>
            <Link to="./invite">
              <Icon icon="plus" className="me-1" />
              {t('users:invite_user')}
            </Link>
          </ListRowAction>
          <ListBody>
            {members.map((member) => (
              <ListRow key={member.userId}>
                <ListCell header>{member.name}</ListCell>
                <ListCell>{member.email}</ListCell>
                <ListCell>
                  <MultiselectInput
                    className="w-full"
                    name="roles"
                    value={member.roles}
                    items={[
                      {
                        label: t('users:role_admin'),
                        value: LanguageRole.Admin,
                      },
                      {
                        label: t('users:role_translator'),
                        value: LanguageRole.Translator,
                      },
                    ]}
                    onChange={(roles) =>
                      setMembers([
                        ...(members.filter(
                          (m) => m.email !== member.email
                        ) as any[]),
                        {
                          ...members.filter((m) => m.email === member.email)[0],
                          roles,
                        },
                      ])
                    }
                  />
                </ListCell>
                <ListCell>
                  <Button
                    variant="tertiary"
                    onClick={() =>
                      removeMemberMutation.mutate({
                        userId: member.userId,
                        code: params.code,
                      })
                    }
                  >
                    Remove
                  </Button>
                </ListCell>
              </ListRow>
            ))}
          </ListBody>
        </List>
        <div>
          <Link to="./import" variant="button">
            <Icon icon="file-import" className="me-4"></Icon>
            {t('languages:import_glosses')}
          </Link>
        </div>
      </div>
    </View>
  );
}
