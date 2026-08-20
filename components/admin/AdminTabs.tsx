// The admin console's tab strip is the shared underline-tab primitive; it is
// re-exported under the admin names so panels keep reading as console code.
export {
    type UnderlineTabDefinition as AdminTabDefinition,
    UnderlineTabPanel as AdminTabPanel,
    UnderlineTabs as AdminTabs,
} from '@/components/ui/UnderlineTabs';
