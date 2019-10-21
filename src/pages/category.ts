import { html, TemplateResult } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat';
import { css, property } from 'lit-element';

import Page from '../core/strategies/Page';
import { CSS } from '../core/ui/ui';
import { projectCard, projectLoad, ElementWithProjects, iObserverForCard, ProjectMinimal } from './home';
import Constants from '../constants';
import { wrap } from '../core/errors/errors';

class Category extends Page implements ElementWithProjects {
    public static readonly is: string = 'ui-category';

    public static readonly hasRouting: boolean = true;

    @property({type: Object, reflect: false})
    public projects: ReadonlyArray<ProjectMinimal> = [];

    @property({type: Boolean, reflect: false})
    public empty = false;
    
    private _observer = iObserverForCard(.2);
    private _toLoad: string;

    public get head(){
        return {
            title: null,
            description: null,
            type: 'category',
            image: null,
            slug: '#!category'
        };
    }

    public static get styles(){
        return [
            ... super.styles,
            CSS.cards,
            css`
            .category {
                padding: 2em;
                padding-top: 0;
            }

            .not-found {
                display: flex;
                justify-content: center;
                align-items: center;
            }
            `
        ];
    }

    public constructor(slug: string){
        super();
        this._toLoad = slug;
    }

    public async firstUpdated(){
        if(this._toLoad){
            await this._loadRequested();
        } else {
            this.empty = true;
            this.loaded = true;
        }
    }

    private async _loadRequested(){
        const query = `{
            categories(where: {slug:"${this._toLoad}"}) {
              edges {
                node {
                  id,
                  name,
                  slug
                }
              }
            }
          }
        `;

        const projR = await fetch(Constants.graphql, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query
            }),
        }).then(res => res.json()).then(res => res.data).catch(_ => this.dispatchEvent(wrap(_)));
        
        const category = projR.categories.edges;
        const cat = category[0].node;
        if(!category || !cat){
            document.title = 'Non trouvé' + ' | ' + Constants.title;
            this.empty = true;
            this.projects = [];
            this.loaded = true;
            return;
        }

        document.title = cat.name + ' | ' + Constants.title;

        this.projects = [];
        await projectLoad(this, '#cards .card:last-child', cat.slug, this._observer);
        this._toLoad = null;
    }

    public render(): void | TemplateResult {
        return html`
        ${!this.loaded ? html`
        <div class="loading">
            <paper-spinner active></paper-spinner>
        </div>
        ` : html``}

        ${this.loaded && this.empty ? html`
            <p class="not-found">Catégorie non trouvée</p>
        ` : html``}

        <div id="cards" class="category cards" role="main">
        ${repeat(this.projects, (project) =>  projectCard(project))}
        </div>
        `;
    }
}
customElements.define(Category.is, Category);