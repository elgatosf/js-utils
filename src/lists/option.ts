import { z } from "zod/v4-mini";

/**
 * An option within a list of options or option group.
 */
export interface Option {
	/**
	 * Discriminator property used to identify an option.
	 */
	readonly type: "option";

	/**
	 * Determines whether the option is disabled.
	 */
	disabled?: boolean;

	/**
	 * Label that represents the option.
	 */
	label: string;

	/**
	 * Value this option represents.
	 */
	value: boolean | number | string;
}

/**
 * An option within a list of options or option group.
 */
export const Option: z.ZodMiniType<Option> = z.object({
	type: z.literal("option"),
	disabled: z.optional(z.boolean()),
	label: z.string(),
	value: z.union([z.boolean(), z.number(), z.string()]),
});

/**
 * Creates a new option.
 * @param props Properties that define the option.
 * @returns The option.
 */
export function option(props: OptionProps): Option {
	const { disabled, label, value } = props;
	return {
		type: "option",
		disabled,
		label,
		value,
	};
}

/**
 * Properties that define an option.
 */
type OptionProps = Omit<Option, "type">;
