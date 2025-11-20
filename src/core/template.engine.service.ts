import Handlebars from 'handlebars';

export interface TemplateContext {
    [key: string]: any;
}

export interface ProcessTemplateResult {
    subject?: string;
    body: string;
    missingVariables: string[];
}

export class TemplateEngineService {
    private handlebars: typeof Handlebars;

    constructor() {
        this.handlebars = Handlebars;
        this.registerHelpers();
    }

    /**
     * Processa um template substituindo variáveis
     */
    process(
        template: string,
        context: TemplateContext,
        requiredVariables?: string[]
    ): string {
        try {
            const compiled = this.handlebars.compile(template);

            return compiled(context);
        } catch (error) {
            throw new Error(
                `Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Processa subject e body de uma vez
     */
    processTemplate(
        subject: string | undefined,
        body: string,
        context: TemplateContext,
        requiredVariables?: string[]
    ): ProcessTemplateResult {
        const missingVariables = this.getMissingVariables(
            subject,
            body,
            context,
            requiredVariables
        );

        const processedSubject = subject ? this.process(subject, context) : undefined;
        const processedBody = this.process(body, context);

        return {
            subject: processedSubject,
            body: processedBody,
            missingVariables,
        };
    }

    /**
     * Extrai variáveis de um template
     * Exemplo: "Hello {{name}} {{surname}}" -> ["name", "surname"]
     */
    extractVariables(template: string): string[] {
        const regex = /\{\{([^}]+)\}\}/g;
        const variables = new Set<string>();
        let match;

        while ((match = regex.exec(template)) !== null) {
            const variable = match[1].trim().split(' ')[0].replace(/^[#/]/, '');
            variables.add(variable);
        }

        return Array.from(variables);
    }

    /**
     * Valida se todas as variáveis necessárias estão presentes
     */
    getMissingVariables(
        subject: string | undefined,
        body: string,
        context: TemplateContext,
        requiredVariables?: string[]
    ): string[] {
        const variables =
            requiredVariables ||
            [
                ...this.extractVariables(body),
                ...(subject ? this.extractVariables(subject) : []),
            ];

        return variables.filter((variable) => {
            const value = context[variable];
            return value === undefined || value === null || value === '';
        });
    }

    /**
     * Valida se template é válido (syntax check)
     */
    validateTemplate(template: string): { valid: boolean; error?: string } {
        try {
            const opens = (template.match(/\{\{/g) || []).length;
            const closes = (template.match(/\}\}/g) || []).length;

            if (opens !== closes) {
                return {
                    valid: false,
                    error: `Unbalanced tags: found ${opens} '{{' but ${closes} '}}'`,
                };
            }

            if (/\{\{[^}]*$/g.test(template)) {
                return {
                    valid: false,
                    error: 'Invalid placeholder: missing closing "}}"',
                };
            }

            try {
                this.handlebars.precompile(template);
            } catch (err) {
                return {
                    valid: false,
                    error: err instanceof Error ? err.message : 'Malformed template',
                };
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unexpected error',
            };
        }
    }


    /**
     * Registra helpers customizados do Handlebars
     */
    private registerHelpers(): void {
        this.handlebars.registerHelper('upper', (str: string) => {
            return str ? str.toUpperCase() : '';
        });

        this.handlebars.registerHelper('lower', (str: string) => {
            return str ? str.toLowerCase() : '';
        });

        this.handlebars.registerHelper('formatDate', (date: Date | string) => {
            if (!date) return '';
            const d = new Date(date);
            return `${String(d.getUTCDate()).padStart(2, '0')}/${String(
                d.getUTCMonth() + 1
            ).padStart(2, '0')}/${d.getUTCFullYear()}`;
        });

        this.handlebars.registerHelper('truncate', (str: string, length: number) => {
            if (!str) return '';
            return str.length > length ? str.substring(0, length) + '...' : str;
        });

        this.handlebars.registerHelper('default', (value: any, defaultValue: any) => {
            return value || defaultValue;
        });
    }
}