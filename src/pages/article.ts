import { html, TemplateResult } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { property, customElement } from 'lit-element';

import Page from '../core/strategies/Page';
import Constants from '../constants';

import { Utils, decodeHTML, onImageContainerClicked } from '../core/ui/ui';
import { fadeWith } from '../core/animations';
import { ProjectMinimal } from './project';
import { wrap } from '../core/errors/errors';

@customElement('ui-post')
export class Single extends Page {
    public static readonly is: string = 'ui-post';

    public static readonly hasRouting: boolean = true;

    @property({type: Object, reflect: false})
    public article: ProjectMinimal;
    @property({type: String, reflect: false})
    public featured: string;
    private _toLoad: string;

    public constructor(toLoad: string){
        super();

        this._toLoad = toLoad;
    }

    public firstUpdated(): Promise<void> {
        return this._load();
    }
    
    private async _load(){
        const projectQuery = `
        {
            postBy(slug: "${this._toLoad}") {
                title
                content
                excerpt
                featuredImage {
                sourceUrl
                }
            }
        }              
        `;

        const first = await fetch(Constants.graphql, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: projectQuery
            })
        }).then(res => res.json()).then(res => res.data.postBy).catch(_ => this.dispatchEvent(wrap(_))) as ProjectMinimal;

        this.loaded = true;

        const post = first;
        document.title = post.title + ' | ' + Constants.title;
        this.article = post;
        this.featured = post?.featuredImage?.sourceUrl ? post.featuredImage.sourceUrl : '/assets/logo.png';

        if(Utils.animationsReduced()){
            return;
        }
        const fade = fadeWith(300, true);
        this.page.animate(fade.effect, fade.options); 
    }

    public render(): void | TemplateResult {
        return html`
        <div id="blog" class="blog single" role="main">
            ${!this.loaded ? html`
            <div class="loading">
                <paper-spinner active></paper-spinner>
            </div>` : html``}
            ${this.article ? html`
            <h1>${decodeHTML(this.article.title)}</h1>
            ${this.featured ? html`
            <div class="image-container" @click=${onImageContainerClicked}>
                <elara-image .catch=${true} src="${this.featured}"></elara-image>
            </div>
            ` : html``}
            <div class="content">
                ${unsafeHTML(this.article.content)}
            </div>
            ` : html``}
        </div>
        `;
    }

    private get page(){
        return this.querySelector('#blog');
    }
}